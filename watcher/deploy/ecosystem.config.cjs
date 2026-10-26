// pm2 config for the public watcher. Start it as the watcher's own user, never root:
//   sudo -u vaultwatch -H pm2 start /var/www/vault-watcher-public/watcher/deploy/ecosystem.config.cjs
module.exports = {
    apps: [{
        name: 'vault-watcher-public',
        script: 'server.js',
        cwd: '/var/www/vault-watcher-public/watcher',
        instances: 1,                 // one process: the store is plain files
        exec_mode: 'fork',
        max_memory_restart: '250M',
        restart_delay: 5000,
        env: { NODE_ENV: 'production', TZ: 'UTC' },
        time: true
    }]
};
