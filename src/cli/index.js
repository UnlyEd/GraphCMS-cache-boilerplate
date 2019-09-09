import { createLogger } from '@unly/utils-simple-logger';
import inquirer from 'inquirer';
import logSymbols from 'log-symbols';

import { querySchemaData, querySchemaData2 } from '../../gql/querySchema';
import { exit, refreshCache, resetCache, sendQuery } from './commandsHandler';

const logger = createLogger({
  label: 'Cache handler',
});

const promptObj = {
  type: 'list',
  name: 'actions',
  message: 'What do you want to do?',
  choices: [
    {
      name: 'Send query 1 - EN, FR',
      value: 'send-cache1-en',
      callback: sendQuery,
      args: [querySchemaData, 'EN, FR'],
    },
    {
      name: 'Send query 1 - FR, EN',
      value: 'send-cache1-fr',
      callback: sendQuery,
      args: [querySchemaData, 'FR, EN'],
    },
    {
      name: 'Send query 2 - EN, FR',
      value: 'send-cache2-en',
      callback: sendQuery,
      args: [querySchemaData2, 'EN, FR'],
    },
    {
      name: 'Send query 2 - FR, EN',
      value: 'send-cache2-fr',
      callback: sendQuery,
      args: [querySchemaData2, 'FR, EN'],
    },
    {
      name: 'Refresh all cache',
      value: 'refresh-cache',
      callback: refreshCache,
      args: [],
    },
    {
      name: 'Reset all cache',
      value: 'reset-cache',
      callback: resetCache,
      args: [],
    },
    {
      name: 'Quit client',
      value: 'exit',
      callback: exit,
      args: [],
    },
  ],
};

async function cli() {
  const answer = await inquirer.prompt([promptObj]);
  const commandHandler = promptObj.choices.filter((el) => el.value === answer.actions);

  if (commandHandler.length !== 1 || typeof commandHandler[0].callback === 'undefined') {
    logger.error(`${logSymbols.error}Unknown command '${answer.actions}', please make sure you have set a callback function`);
  } else {
    const { args } = commandHandler[0];
    await commandHandler[0].callback.apply(null, args);
  }

  await cli();
}

try {
  cli();
} catch (e) {
  logger.error(logSymbols.error + e);
}
