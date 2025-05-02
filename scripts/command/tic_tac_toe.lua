name = "TicTacToe"
description = "Play TicTacToe against a friend or the computer (.move <1–9>)"
author = "Block4711 with ChatGPT"

local board, current, gameOver, winner
local pcMode = false  -- PvC off by default

-- Initialize the game
local function reset()
    board = {{"", "", ""}, {"", "", ""}, {"", "", ""}}
    current = "X"
    gameOver = false
    winner = nil
end

reset()

-- Check for winner
local function checkWin()
    for i = 1, 3 do
        if board[i][1] ~= "" and board[i][1] == board[i][2] and board[i][2] == board[i][3] then return board[i][1] end
        if board[1][i] ~= "" and board[1][i] == board[2][i] and board[2][i] == board[3][i] then return board[1][i] end
    end
    if board[1][1] ~= "" and board[1][1] == board[2][2] and board[2][2] == board[3][3] then return board[1][1] end
    if board[1][3] ~= "" and board[1][3] == board[2][2] and board[2][2] == board[3][1] then return board[1][3] end
    local full = true
    for r = 1, 3 do for c = 1, 3 do if board[r][c] == "" then full = false end end end
    if full then return "D" end
    return nil
end

-- AI move using minimax
local function minimax(b, isMax)
    local win = checkWin()
    if win == "O" then return 1 end
    if win == "X" then return -1 end
    if win == "D" then return 0 end

    local best = isMax and -math.huge or math.huge
    for r = 1,3 do for c = 1,3 do
        if b[r][c] == "" then
            b[r][c] = isMax and "O" or "X"
            local score = minimax(b, not isMax)
            b[r][c] = ""
            if isMax then best = math.max(best, score) else best = math.min(best, score) end
        end
    end end
    return best
end

local function aiMove()
    local bestScore = -math.huge
    local move = {1, 1}
    for r = 1, 3 do for c = 1, 3 do
        if board[r][c] == "" then
            board[r][c] = "O"
            local score = minimax(board, false)
            board[r][c] = ""
            if score > bestScore then
                bestScore = score
                move = {r, c}
            end
        end
    end end
    board[move[1]][move[2]] = "O"
end

-- Print the board
local function printBoard()
    print("TicTacToe Board:")
    for r = 1, 3 do
        local row = ""
        for c = 1, 3 do
            row = row .. (board[r][c] == "" and "_" or board[r][c]) .. " "
        end
        print(row)
    end
end

-- Command: .move <1–9>
registerCommand("move", function(args)
    if #args == 0 then
        print("Usage: .move <1–9> | .tictactoe reset | .tictactoe mode pc/pvp")
        return
    end

    local pos = tonumber(args[1])
    if not pos or pos < 1 or pos > 9 then
        print("Invalid position! Use 1–9.")
        return
    end
    if gameOver then print("Game is over! Use .tictactoe reset to play again.") return end

    local r = math.ceil(pos / 3)
    local c = ((pos - 1) % 3) + 1

    if board[r][c] ~= "" then
        print("Cell already occupied.")
        return
    end

    board[r][c] = current
    local win = checkWin()
    if win then
        gameOver = true
        printBoard()
        if win == "D" then
            print("It's a draw!")
        else
            print("Winner: " .. win)
        end
        return
    end

    -- Switch player or run AI
    if pcMode and current == "X" then
        current = "O"
        aiMove()
        local w2 = checkWin()
        if w2 then
            gameOver = true
            printBoard()
            if w2 == "D" then print("It's a draw!") else print("Winner: " .. w2) end
            return
        end
        current = "X"
    else
        current = (current == "X") and "O" or "X"
    end

    printBoard()
    print("Current turn: " .. current)
end)

-- Command: .tictactoe reset / mode
registerCommand("tictactoe", function(args)
    if args[1] == "reset" then
        reset()
        print("Game has been reset.")
        printBoard()
    elseif args[1] == "mode" and args[2] then
        if args[2] == "pc" then
            pcMode = true
            print("Mode set: Player vs Computer")
        elseif args[2] == "pvp" then
            pcMode = false
            print("Mode set: Player vs Player")
        else
            print("Unknown mode. Use pc or pvp.")
        end
    else
        print("Available commands:")
        print(".move <1–9> → make a move")
        print(".tictactoe reset → reset the game")
        print(".tictactoe mode pc|pvp → set game mode")
    end
end)
