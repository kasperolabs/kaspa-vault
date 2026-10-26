// Every transaction test/spend.js builds, judged by rusty-kaspa's own code:
//   - Transaction::id() must equal the id this package computed
//   - MassCalculator (mainnet params): compute, transient and storage mass must equal ours
//   - TxScriptEngine runs every input: valid fixtures must pass, forged ones must be refused
//
// Run from a silverscript checkout (tools/engine-test.sh does it):
//   VAULT_FIXTURES=$PWD/test/engine/fixtures.json cargo test -p silverscript-lang --test vault_consensus -- --nocapture
// test/engine/standalone/ runs the same file against rusty-kaspa at the v2.1.0 tag.

use kaspa_consensus_core::config::params::MAINNET_PARAMS;
use kaspa_consensus_core::hashing::sighash::SigHashReusedValuesUnsync;
use kaspa_consensus_core::mass::MassCalculator;
use kaspa_consensus_core::subnets::SUBNETWORK_ID_NATIVE;
use kaspa_consensus_core::tx::{
    MutableTransaction, ScriptPublicKey, Transaction, TransactionId, TransactionInput, TransactionOutpoint, TransactionOutput, UtxoEntry,
    VerifiableTransaction,
};
use kaspa_txscript::caches::Cache;
use kaspa_txscript::{EngineCtx, EngineFlags, TxScriptEngine};
use serde_json::Value;
use std::str::FromStr;

fn hex(s: &str) -> Vec<u8> {
    let mut out = vec![0u8; s.len() / 2];
    faster_hex::hex_decode(s.as_bytes(), &mut out).expect("hex");
    out
}
// rusty-kaspa v2.1.0 always runs covenant opcodes (EngineFlags has no switch any more); the older
// commit silverscript pins still needs covenants_enabled. The standalone crate turns on `v2_1_0`.
#[cfg(feature = "v2_1_0")]
fn engine_flags() -> EngineFlags {
    EngineFlags::default()
}
#[cfg(not(feature = "v2_1_0"))]
fn engine_flags() -> EngineFlags {
    EngineFlags { covenants_enabled: true, ..Default::default() }
}

fn u(v: &Value) -> u64 {
    v.as_str().map(|s| s.parse().unwrap()).or_else(|| v.as_u64()).expect("number")
}

#[test]
fn vault_transactions_match_consensus() {
    let path = std::env::var("VAULT_FIXTURES").expect("set VAULT_FIXTURES to test/engine/fixtures.json");
    let doc: Value = serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
    let mc = MassCalculator::new_with_consensus_params(&MAINNET_PARAMS);
    let mut failures = 0;

    for f in doc["fixtures"].as_array().unwrap() {
        let name = f["name"].as_str().unwrap();
        let t = &f["tx"];
        let inputs: Vec<TransactionInput> = t["inputs"]
            .as_array()
            .unwrap()
            .iter()
            .map(|i| {
                TransactionInput::new(
                    TransactionOutpoint::new(TransactionId::from_str(i["txid"].as_str().unwrap()).unwrap(), i["index"].as_u64().unwrap() as u32),
                    hex(i["signatureScript"].as_str().unwrap()),
                    u(&i["sequence"]),
                    i["sigOpCount"].as_u64().unwrap() as u8,
                )
            })
            .collect();
        let outputs: Vec<TransactionOutput> = t["outputs"]
            .as_array()
            .unwrap()
            .iter()
            .map(|o| {
                TransactionOutput::new(u(&o["value"]), ScriptPublicKey::from_vec(o["spkVersion"].as_u64().unwrap() as u16, hex(o["spk"].as_str().unwrap())))
            })
            .collect();
        let tx = Transaction::new(0, inputs, outputs, u(&t["lockTime"]), SUBNETWORK_ID_NATIVE, 0, vec![]);
        let entries: Vec<UtxoEntry> = f["entries"]
            .as_array()
            .unwrap()
            .iter()
            .map(|e| {
                UtxoEntry::new(
                    u(&e["amount"]),
                    ScriptPublicKey::from_vec(e["spkVersion"].as_u64().unwrap() as u16, hex(e["spk"].as_str().unwrap())),
                    u(&e["daa"]),
                    false,
                    None,
                )
            })
            .collect();

        // id
        let id_ok = tx.id().to_string() == f["txid"].as_str().unwrap();

        // mass
        let nc = mc.calc_non_contextual_masses(&tx);
        let mtx = MutableTransaction::with_entries(tx.clone(), entries.clone());
        let storage = mc.calc_contextual_masses(&mtx.as_verifiable()).map(|m| m.storage_mass);
        let m = &f["masses"];
        let mass_ok = nc.compute_mass == u(&m["compute"]) && nc.transient_mass == u(&m["transient"]) && storage == Some(u(&m["storage"]));

        // fee covers the relay floor (100 sompi/gram on compute or normalized transient)
        let total_in: u64 = entries.iter().map(|e| e.amount).sum();
        let total_out: u64 = tx.outputs.iter().map(|o| o.value).sum();
        let fee = total_in - total_out;
        let relay_mass = nc.compute_mass.max(nc.transient_mass.div_ceil(2));
        let fee_ok = fee == u(&f["fee"]) && fee >= relay_mass * 100;

        // script engine, every input
        let vtx = mtx.as_verifiable();
        let reused = SigHashReusedValuesUnsync::new();
        let cache = Cache::new(10_000);
        let mut script_err = None;
        for i in 0..vtx.inputs().len() {
            let mut vm = TxScriptEngine::from_transaction_input(
                &vtx,
                &vtx.inputs()[i],
                i,
                &entries[i],
                EngineCtx::new(&cache).with_reused(&reused),
                engine_flags(),
            );
            if let Err(e) = vm.execute() {
                script_err = Some(format!("input {i}: {e}"));
                break;
            }
        }
        let expect_valid = f["expectValid"].as_bool().unwrap();
        let script_ok = if expect_valid { script_err.is_none() } else { script_err.is_some() };

        let all = id_ok && mass_ok && script_ok && (fee_ok || !expect_valid);
        if !all {
            failures += 1;
        }
        println!(
            "  {}  {:<55} id {}  mass {} (c{} t{} s{})  fee {}  script {}",
            if all { "PASS" } else { "FAIL" },
            name,
            if id_ok { "ok" } else { "DIFF" },
            if mass_ok { "ok" } else { "DIFF" },
            nc.compute_mass,
            nc.transient_mass,
            storage.unwrap_or(0),
            if fee_ok { "ok" } else { "LOW" },
            match (&script_err, expect_valid) {
                (None, true) => "ok".to_string(),
                (Some(e), false) => format!("refused as expected ({e})"),
                (None, false) => "ACCEPTED A FORGERY".to_string(),
                (Some(e), true) => format!("REFUSED: {e}"),
            }
        );
    }
    assert_eq!(failures, 0, "{failures} fixture(s) disagree with consensus");
}
