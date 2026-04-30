const log = require('./logger')
const { DataApiClient } = require('rqlite-js')
const CryptoJS = require('crypto-js')

const CACHE_HOSTS = process.env.TOKEN_CACHE_URL || ['http://bot-cache-0.bot-cache-internal.datastore.svc.cluster.local:4001', 'http://bot-cache-1.bot-cache-internal.datastore.svc.cluster.local:4001', 'http://bot-cache-2.bot-cache-internal.datastore.svc.cluster.local:4001']
const NAME_SPACE = process.env.CACHE_NAMESPACE || process.env.NAME_SPACE || 'default'
const TOKEN_CACHE_KEY = process.env.TOKEN_CACHE_KEY || process.env.DISCORD_CLIENT_SECRET

const dataApiClient = new DataApiClient(CACHE_HOSTS)
let CACHE_READY = true

const reportError = (dataResults)=>{
  let err = dataResults?.getFirstError()
  if(err) log.error(err)
}

const init = async()=>{
  try{
    let sql = `CREATE TABLE IF NOT EXISTS "bot_tokens_${NAME_SPACE}" (id TEXT PRIMARY KEY, data TEXT NOT NULL, ttl INTEGER)`
    let dataResults = await dataApiClient.execute(sql)
    if(dataResults?.hasError()){
      reportError(dataResults)
      setTimeout(init, 5000)
      return
    }
    log.info(`created rqlite table bot_tokens_${NAME_SPACE}`)
    BOT_CACHE_READY = true
  }catch(e){
    log.error(e)
    setTimeout(init, 5000)
  }
}
init()


function encryptId(str, key){
  if(!str || !key) return
  return CryptoJS.AES.encrypt(str, key).toString()
}
function decryptId(str, key){
  if(!str || !key) return
  return CryptoJS.AES.decrypt(str, key).toString(CryptoJS.enc.Utf8)
}

async function getCache(key){
  try{
    if(!key || !CACHE_READY) return

    let sql = `SELECT data FROM "bot_tokens_${NAME_SPACE}" WHERE id="${key.toString()}"`
    let res = await dataApiClient.query(sql)
    if(res.hasError()){
      reportError(res)
      return
    }
    let result = res.get(0)
    let decryptedStr = decryptId(result?.data?.data, TOKEN_CACHE_KEY)
    if(decryptedStr) return JSON.parse(decryptedStr)
  }catch(e){
    log.error(e)
  }
}
async function setCache(key, val){
  try{
    if(!key || !val || !CACHE_READY) return

    let encryptedStr = encryptId(JSON.stringify(val), TOKEN_CACHE_KEY)
    if(!encryptedStr) return
    let sql = [
      [`INSERT INTO "bot_tokens_${NAME_SPACE}" (id, data, ttl) VALUES(:id, :data, ${Date.now()}) ON CONFLICT(id) DO UPDATE set data=:data, ttl=${Date.now()}`, { id: key.toString(), data: encryptedStr }]
    ]
    let dataResults = await dataApiClient.execute(sql)
    if(dataResults?.hasError()){
      reportError(dataResults)
      return
    }
    return dataResults?.get(0)?.getRowsAffected()
  }catch(e){
    log.error(e)
  }
}
async function delCache(key){
  try{
    if(!key || !CACHE_READY) return

    let sql = `DELETE FROM "bot_tokens_${NAME_SPACE}" WHERE id="${key}"`
    let dataResults = await dataApiClient.execute(sql)
    if(dataResults?.hasError()){
      reportError(dataResults)
      return
    }
    return dataResults?.get(0)?.getRowsAffected()
  }catch(e){
    log.error(e)
  }
}
module.exports = {
  del: delCache,
  get: getCache,
  set: setCache,
  status: ()=> { return CACHE_READY },
}
