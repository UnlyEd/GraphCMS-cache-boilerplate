export const responseSchemaData = {
  data: {
    __schema: {
      __typename: '__Schema',
      mutationType: {
        __typename: '__Type',
        kind: 'OBJECT',
      },
    },
  },
  loading: false,
  networkStatus: 7,
  stale: false,
};

export const eventExample = {
  body: `{"operationName":null,"variables":{},"query":"{__schema { mutationType { kind }}}"}`,
  headers: {
    'gcms-locale': 'EN',
  },
};
