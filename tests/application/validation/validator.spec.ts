import { Validation, Validator } from '@/application/validation'; // Atualize o caminho aqui conforme necessário
import { mock, MockProxy } from 'jest-mock-extended';

describe('Validation', () => {
  let sut: Validation;
  let validator: MockProxy<Validator>;

  beforeEach(() => {
    validator = mock<Validator>();
    sut = new Validation(validator);
  });

  it('should call the validator with the correct parameters', async () => {
    const value = { field: 'valid-value' };
    validator.validate.mockResolvedValue([]);

    await sut.validate(value);

    expect(validator.validate).toHaveBeenCalledWith(value, {
      validationError: { target: false },
    });
  });

  it('should return the validation result on success', async () => {
    const value = { field: 'valid-value' };
    const validationResult: any[] = []; // Define explicitamente o tipo como any[]
    validator.validate.mockResolvedValue(validationResult);

    const result = await sut.validate(value);

    expect(result).toEqual(validationResult);
  });

  it('should throw an error if validation fails', async () => {
    const value = { field: 'invalid-value' };
    const validationError = new Error('Validation error');
    validator.validate.mockRejectedValue(validationError);

    await expect(sut.validate(value)).rejects.toThrow('Validation error');
  });
});
