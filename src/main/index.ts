import './config/module-alias';
import { env } from '@/main/config/env';
import { logger } from '@/infra/helpers';
import { MySQLConnection } from '@/infra/repos/mysql/helpers';

import 'reflect-metadata';

MySQLConnection.getInstance()
  .initialize()
  .then(async () => {
    logger.info(`Loading application configuration...`)
    const { app } = await import('@/main/config/app');
    app.listen(env.port, () =>
      logger.log(`Server running at http://localhost:${env.port}`)
    );
  })
  .catch((error) => {
    logger.error(`Mysql connection error: ${error.message} ${JSON.stringify(env.database.mysql)}`);
  });
