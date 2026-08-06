/**
 * Exact implementation of verssache/qris-dinamis
 * Source: https://github.com/verssache/qris-dinamis
 */

function crc16(str: string): string {
  let crc = 0xffff
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff
      } else {
        crc = (crc << 1) & 0xffff
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0')
}

export function generateDynamicQris(qrisStatis: string, amount: number): string {
  if (!qrisStatis || !qrisStatis.startsWith('000201')) {
    qrisStatis = '00020101021126670016ID.CO.QRIS.WWW01189360091430000000000215ID1020000000000030303936520458125802ID5914ROMEBOIS POS6007JAKARTA610512110622207QRIS1234566304ABCD'
  }

  // Step 1: Remove existing 4-digit CRC from static QRIS
  let qrisData = qrisStatis.trim()
  if (qrisData.slice(-8, -4) === '6304') {
    qrisData = qrisData.slice(0, -8)
  } else if (qrisData.includes('6304')) {
    qrisData = qrisData.substring(0, qrisData.lastIndexOf('6304'))
  }

  // Step 2: Convert Tag 010211 (Static) to 010212 (Dynamic)
  qrisData = qrisData.replace('010211', '010212')

  // Step 3: Split by 5802ID (Country Code tag)
  const parts = qrisData.split('5802ID')

  // Step 4: Construct Tag 54 (Transaction Amount)
  const amountStr = Math.round(amount).toString()
  const amountTag = '54' + amountStr.length.toString().padStart(2, '0') + amountStr

  // Step 5: Reassemble Payload + Tag 6304
  let newQris = ''
  if (parts.length >= 2) {
    newQris = parts[0] + amountTag + '5802ID' + parts[1] + '6304'
  } else {
    newQris = qrisData + amountTag + '6304'
  }

  // Step 6: Calculate final CRC16
  const checksum = crc16(newQris)

  return newQris + checksum
}
