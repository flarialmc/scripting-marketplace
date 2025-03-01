
function onEnable()
    Notify("TPS enabled!")
end

function onDisable()
    Notify("TPS disabled!")
end

local Ticks = {}

onEvent(EventType.onTickEvent, function()
    local currentTime = os.clock()
    if Ticks then
        table.insert(Ticks, currentTime)
        while (Ticks[1] and (Ticks[1] <= currentTime - 1)) do
            table.remove(Ticks, 1)
        end
    end
end)

onEvent(EventType.onRenderEvent, function()
    if Ticks then
        GUI.NormalRender(26, "TPS: " .. #Ticks)
    end
end)
