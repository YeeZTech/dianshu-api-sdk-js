import { YPCCrypto } from "@yeez-tech/meta-encryptor";

export async function decryptTaskResult(privateKeyHex, taskResultHex, encoding = 'utf-8') {
  const res = YPCCrypto.decryptMessage(
    Buffer.from(privateKeyHex, "hex"),
    Buffer.from(taskResultHex, "hex")
  );
  if (encoding === "hex") {
    return res.toString("hex");
  } else if (encoding === "utf-8" || encoding === "utf8") {
    return res.toString("utf-8");
  }
  return res.toString();
}
