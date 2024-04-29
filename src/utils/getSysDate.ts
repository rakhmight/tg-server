export function getSysDate(){
    const date = new Date()
  
    const year = date.getFullYear()
    const month = date.getMonth()+1
    const day = date.getDate()
  
    return `${day<10 ? '0'+day : day}.${month<10 ? '0'+month : month}.${year}`
}