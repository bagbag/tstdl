local dataHash = KEYS[1]
local dequeueTimeZetKey = KEYS[2]
local timestamp = tonumber(ARGV[1])
local count = tonumber(ARGV[2])

local items = { }

for i = 3, #KEYS do
  local list = KEYS[i]

  while #items < count do
    local jobId = redis.call('lpop', list)

    if jobId ~= false then
      redis.call('zadd', dequeueTimeZetKey, timestamp, jobId)
      local jobData = redis.call('hget', dataHash, jobId)
      table.insert(items, jobData)
    else
      break
    end
  end
end

return items
