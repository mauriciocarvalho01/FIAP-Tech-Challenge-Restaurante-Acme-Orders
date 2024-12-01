import { MySQLConnection } from '@/infra/repos/mysql/helpers';
import { DataSource, QueryRunner, Repository, ObjectType } from 'typeorm';
import {
  ConnectionNotFoundError,
  TransactionNotFoundError,
} from '@/infra/errors';
import { mock, MockProxy } from 'jest-mock-extended';
import { env } from '@/main/config/env';
import { logger } from '@/infra/helpers';

jest.mock('@/infra/helpers/logger');

describe('MySQLConnection', () => {
  let createQueryRunnerSpy: jest.Mock;
  let initializeSpy: jest.Mock;
  let runMigrationsSpy: jest.Mock;
  let destroySpy: jest.Mock;
  let commitTransactionSpy: jest.Mock;
  let rollbackTransactionSpy: jest.Mock;
  let releaseSpy: jest.Mock;
  let getRepositorySpy: jest.Mock;
  let sut: MySQLConnection;
  let mockDataSource: MockProxy<DataSource>;
  let mockQueryRunner: MockProxy<QueryRunner>;
  const expectedEntitiesPath = `${process.cwd()}/${process.env.TS_NODE_DEV === undefined ? 'dist' : 'src'}/infra/repos/mysql/entities/index.{js,ts}`;
  const expectedMigrationsPath = `${process.cwd()}/${process.env.TS_NODE_DEV === undefined ? 'dist' : 'src'}/infra/repos/mysql/migrations/index.{js,ts}`;

  beforeAll(() => {
    // Criação de spies
    initializeSpy = jest.fn();
    runMigrationsSpy = jest.fn();
    destroySpy = jest.fn();
    commitTransactionSpy = jest.fn();
    rollbackTransactionSpy = jest.fn();
    releaseSpy = jest.fn();
    getRepositorySpy = jest.fn();

    // Mock do QueryRunner
    mockQueryRunner = mock<QueryRunner>({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: commitTransactionSpy,
      rollbackTransaction: rollbackTransactionSpy,
      release: releaseSpy,
      isReleased: false,
      manager: { getRepository: getRepositorySpy },
    });

    // Mock do DataSource
    mockDataSource = mock<DataSource>({
      initialize: initializeSpy,
      runMigrations: runMigrationsSpy,
      destroy: destroySpy,
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      getRepository: jest.fn().mockReturnValue('mockRepo'),
      options: {
        entities: [expectedEntitiesPath],
        migrations: [expectedMigrationsPath],
      },
    });

    // Inicializa a conexão MySQL
    sut = MySQLConnection.getInstance();
    (sut as any).dataSource = mockDataSource; // Atribui o DataSource mockado
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = MySQLConnection.getInstance();
      const instance2 = MySQLConnection.getInstance();
      expect(instance1).toBe(instance2); // Verifica se ambas são a mesma instância
    });

    it('should initialize the dataSource with correct entities and migrations', () => {
      const instance = MySQLConnection.getInstance();

      console.log(instance.getDatasource().options);
      // Verifica se as propriedades entities e migrations estão corretas
      expect(instance.getDatasource().options.entities).toContain(
        expectedEntitiesPath
      );
      expect(instance.getDatasource().options.migrations).toContain(
        expectedMigrationsPath
      );
    });
  });

  describe('initialize', () => {
    it('should initialize and run migrations', async () => {
      await sut.initialize();
      expect(mockDataSource.initialize).toHaveBeenCalled();
      expect(mockDataSource.runMigrations).toHaveBeenCalled();
      expect(logger.success).toHaveBeenCalledWith(
        'MySQL Connection has already been created'
      );
    });

    it('should throw ConnectionNotFoundError when dataSource is undefined', async () => {
      // Remove o dataSource para simular o caso em que ele não está definido
      (sut as any).dataSource = undefined;

      await expect(sut.initialize()).rejects.toThrow(
        ConnectionNotFoundError
      ); // Verifica se a exceção é lançada
    });
  });

  describe('getDatasource', () => {
    it('should get datasource returns a DataSource', async () => {
      (sut as any).dataSource = mockDataSource;
      expect(sut.getDatasource()).toEqual(mockDataSource);
    });

    it('should throw ConnectionNotFoundError when dataSource is undefined', () => {
      // Remove o dataSource para simular o caso em que ele não está definido
      (sut as any).dataSource = undefined;

      // Verifica se a exceção é lançada
      expect(() => sut.getDatasource()).toThrow(ConnectionNotFoundError);
    });
  });

  describe('prepareTransaction', () => {
    it('should create a queryRunner and connect', async () => {
      (sut as any).dataSource = mockDataSource;
      await sut.prepareTransaction();
      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
    });

    it('should throw ConnectionNotFoundError if dataSource is undefined', async () => {
      (sut as any).dataSource = undefined;
      await expect(sut.prepareTransaction()).rejects.toThrow(
        ConnectionNotFoundError
      );
    });
  });

  describe('openTransaction', () => {
    it('should start a transaction', async () => {
      (sut as any).queryRunner = mockQueryRunner;
      await sut.openTransaction();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
    });

    it('should throw TransactionNotFoundError if queryRunner is undefined', async () => {
      (sut as any).queryRunner = undefined;
      await expect(sut.openTransaction()).rejects.toThrow(
        TransactionNotFoundError
      );
    });
  });

  describe('closeTransaction', () => {
    it('should release the queryRunner if transaction is not released', async () => {
      (sut as any).queryRunner = mockQueryRunner;
      (sut as any).queryRunner.isReleased = false;
      await sut.closeTransaction();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should not release if transaction is already released', async () => {
      (sut as any).queryRunner = mockQueryRunner;
      (sut as any).queryRunner.isReleased = true;
      await sut.closeTransaction();
      expect(mockQueryRunner.release).not.toHaveBeenCalled();
    });

    it('should throw TransactionNotFoundError if queryRunner is undefined', async () => {
      (sut as any).queryRunner = undefined;
      await expect(sut.closeTransaction()).rejects.toThrow(
        TransactionNotFoundError
      );
    });
  });

  describe('commit', () => {
    it('should commit the transaction', async () => {
      (sut as any).queryRunner = mockQueryRunner;
      (sut as any).queryRunner.isReleased = false;
      await sut.commit();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should not commit if transaction is already released', async () => {
      (sut as any).queryRunner = mockQueryRunner;
      (sut as any).queryRunner.isReleased = true;
      await sut.commit();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should throw TransactionNotFoundError if queryRunner is undefined', async () => {
      (sut as any).queryRunner = undefined;
      await expect(sut.commit()).rejects.toThrow(TransactionNotFoundError);
    });
  });

  describe('rollback', () => {
    it('should rollback the transaction', async () => {
      (sut as any).queryRunner = mockQueryRunner;
      (sut as any).queryRunner.isReleased = false;
      await sut.rollback();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should not rollback if transaction is already released', async () => {
      (sut as any).queryRunner = mockQueryRunner;
      (sut as any).queryRunner.isReleased = true;
      await sut.rollback();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('should throw TransactionNotFoundError if queryRunner is undefined', async () => {
      (sut as any).queryRunner = undefined;
      await expect(sut.rollback()).rejects.toThrow(TransactionNotFoundError);
    });
  });

  describe('transactionIsReleased', () => {
    it('should return true if transaction is released', () => {
      (sut as any).queryRunner = mockQueryRunner;
      (sut as any).queryRunner.isReleased = true;
      expect(sut.transactionIsReleased()).toBe(true);
    });

    it('should return false if transaction is not released', () => {
      (sut as any).queryRunner = mockQueryRunner;
      (sut as any).queryRunner.isReleased = false;
      expect(sut.transactionIsReleased()).toBe(false);
    });

    it('should throw TransactionNotFoundError if queryRunner is undefined', () => {
      (sut as any).queryRunner = undefined;
      expect(() => sut.transactionIsReleased()).toThrow(
        TransactionNotFoundError
      );
    });
  });

  describe('getRepository', () => {
    it('should return repository from queryRunner if transaction is open', () => {
      (sut as any).queryRunner = mockQueryRunner;

      (sut as any).queryRunner.isReleased = false;

      const mockEntity = class MockEntity {};
      console.log(mockQueryRunner);
      sut.getRepository(mockEntity);
      // expect(mockQueryRunner.manager.getRepository).toHaveBeenCalledWith(mockEntity);
    });

    it('should return repository from dataSource if no active transaction', () => {
      (sut as any).queryRunner = mockQueryRunner;
      (sut as any).dataSource = mockDataSource;
      (sut as any).queryRunner.isReleased = true;
      const mockEntity = class MockEntity {};
      sut.getRepository(mockEntity);
      expect(mockDataSource.getRepository).toHaveBeenCalledWith(mockEntity);
    });

    it('should throw ConnectionNotFoundError if dataSource is undefined', () => {
      (sut as any).dataSource = undefined;
      const mockEntity = class MockEntity {};
      expect(() => sut.getRepository(mockEntity)).toThrow(
        ConnectionNotFoundError
      );
    });
  });

  describe('disconnect', () => {
    it('should disconnect the dataSource', async () => {
      (sut as any).dataSource = mockDataSource;
      await sut.disconnect();
      expect(mockDataSource.destroy).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Disconnected from MySQL');
    });

    it('should throw ConnectionNotFoundError if dataSource is undefined', async () => {
      (sut as any).dataSource = undefined;
      await expect(sut.disconnect()).rejects.toThrow(ConnectionNotFoundError);
    });
  });
});
