module.exports = {
  apps: [
    {
      name: 'device-repair-assistant',
      script: 'node_modules/.bin/tsx',
      args: 'src/server/index.ts',
      instances: 1, // Single instance for simple host; scale to 'max' or 2 behind load balancer
      exec_mode: 'fork', // Set to 'cluster' when scaling horizontally across multi-core CPUs
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
