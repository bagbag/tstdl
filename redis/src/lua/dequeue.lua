local dataHash = KEYS[1]
local dequeueTimeZetKey = KEYS[2]
local lpopArgs = { 'lpop' };
local blockDuration = ARGV[1]
local timestamp = ARGV[2]

for i = 3, #KEYS do
  table.insert(lpopArgs, KEYS[i])
end

table.insert(lpopArgs, blockDuration)

local jobId = redis.call(unpack(lpopArgs))

if (jobId ~= false) then
  redis.call('zadd', dequeueTimeZetKey, timestamp, jobId)
  return redis.call('hget', jobId)
else
  return false
end
