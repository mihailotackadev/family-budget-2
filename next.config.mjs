/** @type {import('next').NextConfig} */
export default {
  async headers() {
    return [{ source:'/(.*)', headers:[{ key:'X-Content-Type-Options', value:'nosniff' }] }];
  },
};
