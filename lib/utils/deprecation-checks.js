const semver = require('semver');
const boxen = require('boxen');
const chalk = require('chalk');

const {Extension} = require('../extension');

const nodeDeprecated = () => boxen(chalk.yellow(`
The current Node.js version (${process.versions.node}) has reached end-of-life status.
Ghost-CLI will drop support for this Node.js version in an upcoming release, please update your Node.js version.
See ${chalk.cyan('https://ghost.org/docs/faq/node-versions/')}.
`.trim()), {borderColor: 'yellow', align: 'center'});

const ghostDeprecated = () => boxen(chalk.yellow(`
Ghost 2.x has reached end-of-life status.
Ghost-CLI will drop support for unmaintained Ghost versions in an upcoming release, please update your Ghost version.
See ${chalk.cyan('https://ghost.org/docs/faq/major-versions-lts/')}.
`.trim()), {borderColor: 'yellow', align: 'center'});

const databaseDeprecated = () => boxen(chalk.yellow(`
Warning: MySQL 8 will be the required database in the next major release of Ghost.
Make sure your database is up to date to ensure forwards compatibility.
`.trim()), {borderColor: 'yellow', align: 'center'});

async function deprecationChecks(ui, system) {
    if (semver.lt(process.versions.node, '12.0.0')) {
        ui.log(nodeDeprecated());
    }

    const allInstances = await system.getAllInstances(false);

    const showGhostDeprecation = allInstances
        .some(instance => instance.version && semver.lt(instance.version, '3.0.0'));

    if (showGhostDeprecation) {
        ui.log(ghostDeprecated());
    }

    const showDatabaseDeprecation = (await Promise.all(allInstances
        .map(async (instance) => {
            instance.checkEnvironment();

            const isProduction = (instance.system.environment === 'production');
            const databaseClient = instance.config.get('database.client');

            if (isProduction && databaseClient === 'sqlite3') { // SQLite is only supported in development
                return true;
            } else if (databaseClient === 'mysql') {
                const mysqlExtension = Extension.getInstance(ui, system, 'mysql');

                const serverVersion = await mysqlExtension.getServerVersion();

                if (serverVersion && serverVersion.major !== 8) { // Only MySQL 8 is supported
                    return true;
                }
            }
        })))
        .flatMap(x => x)
        .filter(Boolean)
        .length;

    if (showDatabaseDeprecation) {
        ui.log(databaseDeprecated());
    }
}

module.exports = deprecationChecks;
