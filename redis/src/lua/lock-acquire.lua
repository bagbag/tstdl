local key = KEYS[1]
local id = ARGV[1]
local expireTimestamp = ARGV[2]

local lockedId = redis.call("get", key)
if (lockedId == id) then
  return "owned"
end

if (lockedId ~= false) then
  return "failed"
end

local result = (redis.call("set", key, id, "NX") ~= false)
if (result == true) then
  result = (redis.call("pexpireat", key, expireTimestamp) == 1)
end

if (result == true) then
  return "acquired"
else
  return "failed"
end
