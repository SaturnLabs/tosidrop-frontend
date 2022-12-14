export const abbreviateAddress = (
  address: string,
  start = 7,
  end = 4
): string => {
  return (
    address.substring(0, start) +
    "..." +
    address.substring(address.length - end)
  );
};

export const lovelaceToAda = (lovelace: number) => {
  return (lovelace / Math.pow(10, 6)).toFixed(2);
};

export const isTxHash = (txHash: string) => {
  return txHash.length === 64 && txHash.indexOf(" ") === -1;
};

// Given a string of a token policy followed by a dot and the hex encoded name of the token, returns the token name as a string
// In theory, the hex encoded string is UTF8
// e.g. "148b7f9ce43bf557f74b8f23e90fff8ee479561093e8d7b375ba8468.e382b5e383b3e38397e383ab" -> "サンプル"
export const parseTokenName = (token: string): string => {
  var re = /^[0-9a-fA-F]{56}\.([0-9a-fA-F]*$)/;
  var result = re.exec(token);
  if (result != null && result.length === 2) {
    return hexToUTF8(result.pop()!);
  }
  return token;
};

export const hexToUTF8 = (hex: string): string => {
  var ints = new Uint8Array(hex.length / 2);
  for (var i = 0; i < hex.length / 2; ++i) {
    var start = i * 2;
    ints[i] = parseInt(hex.substring(start, start + 2), 16);
  }
  return new TextDecoder().decode(ints);
};
