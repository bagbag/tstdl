local dataHash = KEYS[1]
local dequeueTimeZetKey = KEYS[2]
local blpopArgs = { 'blpop' };
local blockDuration = ARGS[1]
local timestamp = ARGS[2]

for i = 3, #KEYS do
  table.insert(blpopArgs, KEYS[i])
end

table.insert(blockDuration)

local jobId = redis.call(unpack(blpopArgs))

if (jobId ~= false) then
  redis.call('zadd', dequeueTimeZetKey, timestamp, jobId)
  return redis.call('hget', jobId)
else
  return false
end
