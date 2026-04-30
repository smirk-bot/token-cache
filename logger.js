'use strict'
let logLevel = process.env.LOG_LEVEL || 'info';
function getTimeStamp(timestamp){
  if(!timestamp) timestamp = Date.now()
  let dateTime = new Date(timestamp)
  return dateTime.toLocaleString('en-US', { timeZone: 'Etc/GMT+5', hour12: false })
}
module.exports.error = (err)=>{
  console.error(`${getTimeStamp(Date.now())} ERROR [token-cache] ${err}`)
}
module.exports.info = (msg)=>{
  console.log(`${getTimeStamp(Date.now())} INFO [token-cache] ${msg}`)
}
module.exports.debug = (msg)=>{
  if(logLevel == 'debug') console.log(`${getTimeStamp(Date.now())} DEBUG [token-cache] ${msg}`)
}
