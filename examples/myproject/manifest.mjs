const config = {
  paths: [
    '/',
    '/about',
    { path: '/{thing}/fixed/about', values: { thing: [1, 2, 3] } }
  ],

}
export default config
