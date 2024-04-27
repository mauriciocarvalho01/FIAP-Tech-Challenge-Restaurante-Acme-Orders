export interface TestCategory {
  find: () => Promise<TestCategory.FindOutput>
  save: (input: TestCategory.InsertInput) => Promise<TestCategory.InsertOutput>
}

export namespace TestCategory {
  export type GenericType<T = any> = T
  export type FindInput = { testCategoryId: string }
  export type FindOutput = undefined | {
    id?: number
    testCategoryId: string
    name: string 
    tests?: GenericType[]
  }

  export type InsertInput = {
    id?: number
    testCategoryId: string
    name: string 
    tests?: GenericType[]
  }
  

  export type InsertOutput = undefined | {
    id?: number
    testCategoryId: string
    name?: string
    tests?: GenericType[]
  }
}
