local listKey = KEYS[1]
local dequeueTimeZetKey = KEYS[2]
local timestamp = tonumber(ARGV[1])
local count = tonumber(ARGV[2])

local items = redis.call('zrangebyscore', dequeueTimeZetKey, '-inf', timestamp, 'LIMIT', 0, count)

if next(items) ~= nil then
  redis.call('rpush', listKey, unpack(items))
  redis.call('zrem', dequeueTimeZetKey, unpack(items))
end

return #items
