local listKey = KEYS[1]
local dataHash = KEYS[2]
local dequeueTimeZetKey = KEYS[3]
local timestamp = tonumber(ARGV[1])
local count = tonumber(ARGV[2])

if count == 0 then
  return { }
end

local jobIds = redis.call('lrange', listKey, 0, count - 1)
redis.call('ltrim', listKey, count, -1)

if next(jobIds) == nil then
  return { }
end

local zaddArguments = { }

for i, jobId in ipairs(jobIds) do
  table.insert(zaddArguments, timestamp)
  table.insert(zaddArguments, jobId)
end

redis.call('zadd', dequeueTimeZetKey, unpack(zaddArguments))

local items = redis.call('hmget', dataHash, unpack(jobIds))

return items
