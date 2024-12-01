// MySQLRepository.test.ts
import { MySQLRepository } from '@/infra/repos/mysql';
import { MySQLConnection } from '@/infra/repos/mysql/helpers';
import { ObjectLiteral, ObjectType } from 'typeorm';
import { mock, MockProxy } from 'jest-mock-extended';

// Classe concreta para testes
class TestMySQLRepository extends MySQLRepository {}

describe('MySQLRepository', () => {
  let mockConnection: MockProxy<MySQLConnection>;
  let sut: TestMySQLRepository;

  beforeEach(() => {
    mockConnection = mock<MySQLConnection>();
    jest.spyOn(MySQLConnection, 'getInstance').mockReturnValue(mockConnection);
    sut = new TestMySQLRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should call MySQLConnection.getInstance and assign it to connection', () => {
      expect(MySQLConnection.getInstance).toHaveBeenCalled();
      expect((sut as any).connection).toBe(mockConnection);
    });
  });

  describe('prepareTransaction', () => {
    it('should call prepareTransaction on connection', async () => {
      await sut.prepareTransaction();
      expect(mockConnection.prepareTransaction).toHaveBeenCalled();
    });

    it('should handle errors thrown by prepareTransaction', async () => {
      mockConnection.prepareTransaction.mockRejectedValue(new Error('Transaction Error'));
      await expect(sut.prepareTransaction()).rejects.toThrow('Transaction Error');
    });
  });

  describe('openTransaction', () => {
    it('should call openTransaction on connection', async () => {
      await sut.openTransaction();
      expect(mockConnection.openTransaction).toHaveBeenCalled();
    });

    it('should handle errors thrown by openTransaction', async () => {
      mockConnection.openTransaction.mockRejectedValue(new Error('Open Transaction Error'));
      await expect(sut.openTransaction()).rejects.toThrow('Open Transaction Error');
    });
  });

  describe('closeTransaction', () => {
    it('should call closeTransaction on connection', async () => {
      await sut.closeTransaction();
      expect(mockConnection.closeTransaction).toHaveBeenCalled();
    });

    it('should handle errors thrown by closeTransaction', async () => {
      mockConnection.closeTransaction.mockRejectedValue(new Error('Close Transaction Error'));
      await expect(sut.closeTransaction()).rejects.toThrow('Close Transaction Error');
    });
  });

  describe('commit', () => {
    it('should call commit on connection', async () => {
      await sut.commit();
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('should handle errors thrown by commit', async () => {
      mockConnection.commit.mockRejectedValue(new Error('Commit Error'));
      await expect(sut.commit()).rejects.toThrow('Commit Error');
    });
  });

  describe('rollback', () => {
    it('should call rollback on connection', async () => {
      await sut.rollback();
      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('should handle errors thrown by rollback', async () => {
      mockConnection.rollback.mockRejectedValue(new Error('Rollback Error'));
      await expect(sut.rollback()).rejects.toThrow('Rollback Error');
    });
  });

  describe('isReleased', () => {
    it('should return the result of transactionIsReleased', () => {
      mockConnection.transactionIsReleased.mockReturnValue(true);
      const result = sut.isReleased();
      expect(result).toBe(true);
      expect(mockConnection.transactionIsReleased).toHaveBeenCalled();
    });

    it('should return false when transaction is not released', () => {
      mockConnection.transactionIsReleased.mockReturnValue(false);
      const result = sut.isReleased();
      expect(result).toBe(false);
      expect(mockConnection.transactionIsReleased).toHaveBeenCalled();
    });
  });

  describe('getRepository', () => {
    it('should call getRepository on connection with the correct entity', () => {
      const mockEntity = class MockEntity {};
      sut.getRepository(mockEntity);
      expect(mockConnection.getRepository).toHaveBeenCalledWith(mockEntity);
    });
  });
});
