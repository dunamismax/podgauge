import { installDatabaseRoles } from './roles.js';

await installDatabaseRoles(process.env);
console.log(JSON.stringify({ command: 'db:roles', status: 'complete' }));
