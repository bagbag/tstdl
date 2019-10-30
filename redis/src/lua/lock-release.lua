local key = KEYS[1]
local id = ARGV[1]
local force = ARGV[2]

local lockedId = redis.call("get", key)
local success = 0

if (lockedId == id) or (force == 1) then
  success = redis.call("del", key)
end

return success
