local key = KEYS[1]
local id = ARGV[1]
local expireTimestamp = ARGV[2]

local lockedId = redis.call("get", key)
local success = 0

if (lockedId == id) then
  success = redis.call("pexpireat", key, expireTimestamp)
end

return success
