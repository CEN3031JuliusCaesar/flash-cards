
export const generateSessionToken = () => {
  const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = Date.now().toString(16)+"-";
  while(token.length < 32) {
    token += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
  }
  return token;
}

