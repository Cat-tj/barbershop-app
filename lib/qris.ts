/**
 * QRIS CRC16 Checksum Calculation (CCITT-FALSE)
 * Standard EMVCo QRIS specification
 */
function crc16(str: string): string {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc = crc << 1
      }
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Convert Static QRIS Payload to Dynamic QRIS with exact Amount
 * Based on EMVCo Standard & verssache/qris-dinamis specifications
 */
export function generateDynamicQris(staticPayload: string, amount: number): string {
  if (!staticPayload || !staticPayload.startsWith('000201')) {
    staticPayload = '00020101021226670016ID.CO.QRIS.WWW01189360091430000000000215ID10200000000000303039365204581253033605802ID5914ROMEBOIS POS6007JAKARTA610512110622207QRIS1234566304ABCD'
  }

  let basePayload = staticPayload.trim()
  if (basePayload.includes('6304')) {
    basePayload = basePayload.substring(0, basePayload.lastIndexOf('6304'))
  }

  basePayload = basePayload.replace('010211', '010212')

  const amountStr = Math.round(amount).toString()
  const tag54 = `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`

  let dynamicPayload = ''
  if (basePayload.includes('5802ID')) {
    const parts = basePayload.split('5802ID')
    dynamicPayload = `${parts[0]}${tag54}5802ID${parts[1]}`
  } else {
    dynamicPayload = `${basePayload}${tag54}`
  }

  const payloadToSign = `${dynamicPayload}6304`
  const checksum = crc16(payloadToSign)

  return `${payloadToSign}${checksum}`
}
