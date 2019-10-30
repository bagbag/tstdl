local key = KEYS[1]
local id = ARGV[1]

local lockedId = redis.call("get", key)
local result = 0

if (lockedId == id) then
  local millisecondsLeft = redis.call("pttl", key)
  local time = redis.call("time")
  local timestamp = (millisecondsLeft + (time[1] * 1000) + math.floor(time[2] / 1000))
  result = timestamp
end

return result
