// Path tests for Vault v1 and Airlock v2 against the real Kaspa script engine: real Schnorr
// signatures, real P2SH UTXOs, real sigScripts (<args> <dispatch tag> <redeem>), sequence set for
// this.ageDaa paths. 33 cases; every entry is tried with the right key and refused with the wrong
// key, the wrong destination, an extra output, a burned coin and a mixed-in foreign coin.
//
// First written by the SilverScript Studio session for Kasla (kasla-pack, Oct 21 2026); unchanged
// here except the contract folder variable. The templates in contracts/templates.json produce
// byte-identical scripts (test/compiler-equality.js), so these results hold for them too.
//
// Run inside a checkout of kaspanet/silverscript at 3ed9733:
//   cp test/engine/vault_paths.rs <silverscript>/silverscript-lang/tests/
//   VAULT_CONTRACTS_DIR=$PWD/contracts cargo test -p silverscript-lang --test vault_paths -- --nocapture
// (tools/engine-test.sh does exactly that.)
mod common;

use kaspa_consensus_core::hashing::sighash::{SigHashReusedValuesUnsync, calc_schnorr_signature_hash};
use kaspa_consensus_core::hashing::sighash_type::SIG_HASH_ALL;
use kaspa_consensus_core::mass::units::SigopCount;
use kaspa_consensus_core::tx::{
    MutableTransaction, ScriptPublicKey, Transaction, TransactionId, TransactionInput, TransactionOutpoint, TransactionOutput,
    UtxoEntry, VerifiableTransaction,
};
use kaspa_txscript::caches::Cache;
use kaspa_txscript::opcodes::codes::OpCheckSig;
use kaspa_txscript::script_builder::ScriptBuilder;
use kaspa_txscript::{EngineCtx, EngineFlags, TxScriptEngine, pay_to_script_hash_script};
use rand::{RngCore, thread_rng};
use secp256k1::{Keypair, Secp256k1, SecretKey};
use silverscript_abi::ArtifactValue;
use silverscript_lang::compiler::{CompileOptions, compile_to_sil_abi_artifact_with_options};
use std::fs;

use common::{bytecode, encode_entry_sig_script, push_redeem_script};

const KAS: u64 = 100_000_000;
const DAY: u64 = 864_000;

fn src(name: &str) -> String {
    let dir = std::env::var("VAULT_CONTRACTS_DIR")
        .or_else(|_| std::env::var("KASLA_PACK_DIR"))
        .expect("set VAULT_CONTRACTS_DIR to the folder holding the .sil files");
    fs::read_to_string(format!("{dir}/{name}")).unwrap()
}

fn kp() -> Keypair {
    let secp = Secp256k1::new();
    let mut b = [0u8; 32];
    loop {
        thread_rng().fill_bytes(&mut b);
        if let Ok(sk) = SecretKey::from_slice(&b) {
            return Keypair::from_secret_key(&secp, &sk);
        }
    }
}

fn pk(k: &Keypair) -> Vec<u8> {
    k.x_only_public_key().0.serialize().to_vec()
}

fn p2pk(k: &Keypair) -> ScriptPublicKey {
    ScriptPublicKey::new(0, ScriptBuilder::new().add_data(&pk(k)).unwrap().add_op(OpCheckSig).unwrap().drain().into())
}

fn compile(file: &str, args: Vec<ArtifactValue>) -> (silverscript_abi::SilAbiArtifact, Vec<u8>) {
    let a = compile_to_sil_abi_artifact_with_options(&src(file), &args, CompileOptions::default())
        .unwrap_or_else(|e| panic!("{file} failed to compile: {e}"));
    let b = bytecode(&a);
    (a, b)
}

struct In<'a> {
    art: &'a silverscript_abi::SilAbiArtifact,
    redeem: &'a [u8],
    value: u64,
    sequence: u64,
    entry: &'a str,
    signer: Option<&'a Keypair>,
}

fn spend(ins: &[In], outs: Vec<(u64, ScriptPublicKey)>) -> Result<(), String> {
    let inputs: Vec<TransactionInput> = ins
        .iter()
        .enumerate()
        .map(|(i, x)| TransactionInput {
            previous_outpoint: TransactionOutpoint { transaction_id: TransactionId::from_bytes([i as u8 + 1; 32]), index: 0 },
            signature_script: vec![],
            sequence: x.sequence,
            compute_commit: SigopCount(1).into(),
        })
        .collect();
    let outputs: Vec<TransactionOutput> =
        outs.into_iter().map(|(v, s)| TransactionOutput { value: v, script_public_key: s, covenant: None }).collect();
    let entries: Vec<UtxoEntry> =
        ins.iter().map(|x| UtxoEntry::new(x.value, pay_to_script_hash_script(x.redeem), 0, false, None)).collect();
    let tx = Transaction::new(1, inputs, outputs, 0, Default::default(), 0, vec![]);
    let mut mtx = MutableTransaction::with_entries(tx, entries.clone());

    let reused = SigHashReusedValuesUnsync::new();
    for (i, x) in ins.iter().enumerate() {
        let args: Vec<ArtifactValue> = match x.signer {
            Some(k) => {
                let h = calc_schnorr_signature_hash(&mtx.as_verifiable(), i, SIG_HASH_ALL, &reused);
                let m = secp256k1::Message::from_digest_slice(h.as_bytes().as_slice()).unwrap();
                let mut s = k.sign_schnorr(m).as_ref().to_vec();
                s.push(SIG_HASH_ALL.to_u8());
                vec![s.into()]
            }
            None => vec![],
        };
        let mut ss = encode_entry_sig_script(x.art, x.entry, &args).map_err(|e| e.to_string())?;
        ss.extend_from_slice(&push_redeem_script(x.redeem));
        mtx.tx.inputs[i].signature_script = ss;
    }

    let vtx = mtx.as_verifiable();
    let cache = Cache::new(10_000);
    for i in 0..ins.len() {
        let mut vm = TxScriptEngine::from_transaction_input(
            &vtx,
            &vtx.inputs()[i],
            i,
            &entries[i],
            EngineCtx::new(&cache).with_reused(&reused),
            EngineFlags { covenants_enabled: true, ..Default::default() },
        );
        vm.execute().map_err(|e| format!("input {i}: {e}"))?;
    }
    Ok(())
}

fn ok(name: &str, r: Result<(), String>) {
    assert!(r.is_ok(), "{name} should PASS: {}", r.unwrap_err());
    println!("  PASS  {name}");
}
fn no(name: &str, r: Result<(), String>) {
    assert!(r.is_err(), "{name} should be REFUSED but passed");
    println!("  PASS  {name} (refused: {})", r.unwrap_err());
}

#[test]
fn vault_and_airlock_v2_paths() {
    let (hot, guardian, rescue, thief) = (kp(), kp(), kp(), kp());
    let delay = DAY; // 24h
    let (aa, ar) =
        compile("airlock_v2.sil", vec![pk(&hot).into(), pk(&guardian).into(), pk(&rescue).into(), (delay as i64).into()]);
    let airlock_spk = pay_to_script_hash_script(&ar);
    let airlock_hash = airlock_spk.script()[2..34].to_vec(); // aa 20 <hash> 87
    let (va, vr) =
        compile("vault_v1.sil", vec![pk(&hot).into(), pk(&guardian).into(), pk(&rescue).into(), airlock_hash.into()]);
    let vault_spk = pay_to_script_hash_script(&vr);

    // a coin from a different Vault (same keys, other airlock) for the mixing test
    let (oa, or) =
        compile("vault_v1.sil", vec![pk(&hot).into(), pk(&guardian).into(), pk(&rescue).into(), vec![7u8; 32].into()]);

    let v = |value, entry, signer| In { art: &va, redeem: &vr, value, sequence: 0, entry, signer };
    let l = |value, entry, signer, seq| In { art: &aa, redeem: &ar, value, sequence: seq, entry, signer };

    // Vault
    ok("vault: open one coin into the airlock", spend(&[v(100 * KAS, "open", Some(&hot))], vec![(100 * KAS - 5000, airlock_spk.clone())]));
    ok(
        "vault: open three coins into one airlock coin",
        spend(
            &[v(40 * KAS, "open", Some(&hot)), v(35 * KAS, "open", Some(&hot)), v(25 * KAS, "open", Some(&hot))],
            vec![(100 * KAS - 9000, airlock_spk.clone())],
        ),
    );
    no(
        "vault: open with one coin burned as fee",
        spend(&[v(50 * KAS, "open", Some(&hot)), v(50 * KAS, "open", Some(&hot))], vec![(50 * KAS, airlock_spk.clone())]),
    );
    no("vault: hot key straight to checking", spend(&[v(100 * KAS, "open", Some(&hot))], vec![(100 * KAS - 5000, p2pk(&hot))]));
    no("vault: hot key to the rescue wallet", spend(&[v(100 * KAS, "open", Some(&hot))], vec![(100 * KAS - 5000, p2pk(&rescue))]));
    no("vault: hot key to a thief", spend(&[v(100 * KAS, "open", Some(&hot))], vec![(100 * KAS - 5000, p2pk(&thief))]));
    no("vault: thief key cannot open", spend(&[v(100 * KAS, "open", Some(&thief))], vec![(100 * KAS - 5000, airlock_spk.clone())]));
    no(
        "vault: open with an extra output",
        spend(&[v(100 * KAS, "open", Some(&hot))], vec![(99 * KAS, airlock_spk.clone()), (KAS - 5000, p2pk(&thief))]),
    );
    no(
        "vault: mixing in a coin from another vault",
        spend(
            &[v(50 * KAS, "open", Some(&hot)), In { art: &oa, redeem: &or, value: 50 * KAS, sequence: 0, entry: "open", signer: Some(&hot) }],
            vec![(100 * KAS - 9000, airlock_spk.clone())],
        ),
    );
    ok(
        "vault: merge two coins back into the vault",
        spend(&[v(60 * KAS, "merge", Some(&hot)), v(40 * KAS, "merge", Some(&hot))], vec![(100 * KAS - 9000, vault_spk.clone())]),
    );
    no("vault: merge to the hot wallet", spend(&[v(100 * KAS, "merge", Some(&hot))], vec![(100 * KAS - 5000, p2pk(&hot))]));
    ok(
        "vault: guardian evacuates three coins to the rescue wallet",
        spend(
            &[v(40 * KAS, "evacuate", Some(&guardian)), v(35 * KAS, "evacuate", Some(&guardian)), v(25 * KAS, "evacuate", Some(&guardian))],
            vec![(100 * KAS - 9000, p2pk(&rescue))],
        ),
    );
    no("vault: guardian evacuates to itself", spend(&[v(100 * KAS, "evacuate", Some(&guardian))], vec![(100 * KAS - 5000, p2pk(&guardian))]));
    no("vault: guardian evacuates to hot", spend(&[v(100 * KAS, "evacuate", Some(&guardian))], vec![(100 * KAS - 5000, p2pk(&hot))]));
    no("vault: guardian evacuates to a thief", spend(&[v(100 * KAS, "evacuate", Some(&guardian))], vec![(100 * KAS - 5000, p2pk(&thief))]));
    no("vault: hot key cannot evacuate", spend(&[v(100 * KAS, "evacuate", Some(&hot))], vec![(100 * KAS - 5000, p2pk(&rescue))]));
    no("vault: thief cannot evacuate", spend(&[v(100 * KAS, "evacuate", Some(&thief))], vec![(100 * KAS - 5000, p2pk(&rescue))]));
    no(
        "vault: evacuate with one coin burned as fee",
        spend(&[v(50 * KAS, "evacuate", Some(&guardian)), v(50 * KAS, "evacuate", Some(&guardian))], vec![(50 * KAS, p2pk(&rescue))]),
    );
    no("vault: nobody can skip the airlock without a signature", spend(&[v(100 * KAS, "open", None)], vec![(100 * KAS - 5000, airlock_spk.clone())]));

    // Airlock
    let c = 100 * KAS;
    no("airlock: release before 24h", spend(&[l(c, "release", None, delay - 1)], vec![(c - 5000, p2pk(&hot))]));
    ok("airlock: release at 24h, no signature, to checking", spend(&[l(c, "release", None, delay)], vec![(c - 5000, p2pk(&hot))]));
    no("airlock: release to the rescue wallet", spend(&[l(c, "release", None, delay)], vec![(c - 5000, p2pk(&rescue))]));
    no("airlock: release to a thief", spend(&[l(c, "release", None, delay)], vec![(c - 5000, p2pk(&thief))]));
    no("airlock: release skims over MAX_FEE", spend(&[l(c, "release", None, delay)], vec![(c - 2_000_000, p2pk(&hot))]));
    no(
        "airlock: release with an extra output",
        spend(&[l(c, "release", None, delay)], vec![(99 * KAS, p2pk(&hot)), (KAS - 5000, p2pk(&thief))]),
    );
    ok("airlock: guardian rescues inside the window", spend(&[l(c, "rescue", Some(&guardian), 0)], vec![(c - 5000, p2pk(&rescue))]));
    ok(
        "airlock: guardian rescues two pending coins at once",
        spend(&[l(60 * KAS, "rescue", Some(&guardian), 0), l(40 * KAS, "rescue", Some(&guardian), 0)], vec![(c - 9000, p2pk(&rescue))]),
    );
    ok("airlock: guardian can still rescue after 24h", spend(&[l(c, "rescue", Some(&guardian), delay)], vec![(c - 5000, p2pk(&rescue))]));
    no("airlock: guardian rescues to itself", spend(&[l(c, "rescue", Some(&guardian), 0)], vec![(c - 5000, p2pk(&guardian))]));
    no("airlock: guardian rescues to hot", spend(&[l(c, "rescue", Some(&guardian), 0)], vec![(c - 5000, p2pk(&hot))]));
    no("airlock: hot key cannot rescue", spend(&[l(c, "rescue", Some(&hot), 0)], vec![(c - 5000, p2pk(&rescue))]));
    no("airlock: thief cannot rescue", spend(&[l(c, "rescue", Some(&thief), 0)], vec![(c - 5000, p2pk(&rescue))]));
    no(
        "airlock: rescue with one coin burned as fee",
        spend(&[l(50 * KAS, "rescue", Some(&guardian), 0), l(50 * KAS, "rescue", Some(&guardian), 0)], vec![(50 * KAS, p2pk(&rescue))]),
    );

    for (name, art) in [("Vault", &va), ("Airlock", &aa)] {
        let c = art.contracts.values().next().unwrap();
        for (e, ent) in &c.entries {
            println!("  ABI {name}.{e} dispatch_tag={}", faster_hex::hex_string(ent.dispatch_tag.as_bytes()));
        }
    }
}
