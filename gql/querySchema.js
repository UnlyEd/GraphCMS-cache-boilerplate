import gql from 'graphql-tag';

export const querySchemaData = gql`
  query exampleQuery1{
    __schema {
      mutationType {
        kind
      }
    }
  }
`;

export const querySchemaData2 = gql`
  query exampleQuery2{
    __schema {
      mutationType {
        description
        enumValues {
          isDeprecated
        }
      }
    }
  }
`;
