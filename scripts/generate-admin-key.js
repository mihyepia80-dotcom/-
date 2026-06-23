const crypto = require('crypto');
const key = crypto.randomBytes(24).toString('hex');
console.log('ADMIN_SYNC_KEY (Vercel·로컬 .env에 동일하게 설정):');
console.log(key);
