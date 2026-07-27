import { Helmet } from 'react-helmet-async';
import DocsContainer from 'containers/docs/DocsContainer';

const DocsPage = () => (
  <>
    <Helmet>
      <title>Docs - Lyra</title>
    </Helmet>
    <DocsContainer />
  </>
);

export default DocsPage;
