const config = {
  paths: [
    '/',
    '/about',
    { path: '/{thing1}/{thing2}/about', values: { thing1: [1, 2, 3], thing2: ['one', 'two'] } }
  ],

}
export default config
