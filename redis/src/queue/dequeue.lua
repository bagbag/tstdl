local dequeueTimeZetKey = KEYS[1]
local blpopArgs = { 'blpop' };
local blockDuration = ARGS[1]
local timestamp = ARGS[2]

for i = 2, #KEYS do
  table.insert(blpopArgs, KEYS[i])
end

table.insert(blockDuration)

local jobId = redis.call(unpack(blpopArgs))

if (jobId ~= false) then
  redis.call('zadd', dequeueTimeZetKey, timestamp, jobId)
end

return jobId
