import { FastifyInstance, } from "fastify";
import { Socket } from 'socket.io'

export const socketServer = (app:FastifyInstance) => {
    const maxPlayersCount = 30
    let gameIsStart = false

    const connections:Array<string> = []
    const players:Array<PlayerI> = []
    const rounds:Array<RoundI> = []
    let currentRound = 0

    app.io.on('connection', async (socket: Socket) => {        
        app.log.info({ actor: 'Socket' }, `Socket connecting, ID: ${socket.id}, address: ${socket.conn.remoteAddress}`)
        connections.push(socket.id)

        // TODO: if gameIsStart==true then return player to game

        socket.on('disconnect', () => {
            const disconnectedDevice = connections.find(item=> item == socket.id)
            if(disconnectedDevice) connections.splice(connections.indexOf(disconnectedDevice), 1)

            const playerData = players.find(item => item.socketID == socket.id)
            if(playerData && !gameIsStart) {
                socket.broadcast.emit(`player-left-from-game`, {
                    player: playerData
                })
                
                players.splice(players.indexOf(playerData), 1)
            }
            
            // TODO: авто отключение игры если нехватает людей
        })

        socket.on('join-to-game', (data:{ name: string, id: string }) => {
            if(!gameIsStart){

                // Check by IP
                // const samePlayer = players.find( player => player.address == socket.conn.remoteAddress )
                // if(samePlayer) socket.emit(`join-to-game-${data.id}`, {
                //     connectingIsPossible: false,
                //     reason: 'already'
                // })
                // else {
                    if(players.length < maxPlayersCount) {
                        const getRole = () => {
                            if(players.length == 0) return 'admin'
                            else {
                                const admin = players.find( player => player.role === 'admin')
                                if(admin) return 'player'
                                else return 'admin'
                            }
                        }
                        const role = getRole()
                        const player:PlayerI = {
                            name: data.name,
                            socketID: socket.id,
                            playerID: data.id,
                            address: socket.conn.remoteAddress,
                            hearts: 0,
                            role
                        }
                        
                        players.push(player)
        
                        socket.emit(`join-to-game-${data.id}`, {
                            connectingIsPossible: true,
                            role,
                            players
                        })
    
                        socket.broadcast.emit(`player-join-to-game`, {
                            player
                        })
                    } else{
                        socket.emit(`join-to-game-${data.id}`, {
                            connectingIsPossible: false,
                            reason: 'full'
                        })
                    }
                // }

            } else {
                socket.emit(`join-to-game-${data.id}`, {
                    connectingIsPossible: false,
                    reason: 'began'
                })
            }            
        })

        socket.on('start-game', (data: { heartsCount: number, playerID: PlayerID, rounds: Array<Pick<RoundI, 'blocksCount' | 'disabledBlocks' | 'timer' | 'zeroBlocks' | 'pseudoZeroBlocks'>> }) => {
            const playerData = players.find(player => player.playerID === data.playerID)

            if(playerData){
                if(playerData.role == 'admin'){
                    //gameIsStart = true
                    rounds.length = 0

                    const roundsData = data.rounds.map(round => {
                        const blocksData:Array<BlockDataI> = []
                        for(let i = 0; i!= round.blocksCount; i++){
                            blocksData.push({
                                id: i,
                                players: []
                            })
                        }

                        return {
                            ...round,
                            blocksData,
                            isCompleted: false,
                            startTime: undefined
                        }
                    })

                    rounds.push(...roundsData)

                    socket.broadcast.emit('clients-start-game', { rounds, hearts: data.heartsCount })
                    socket.emit('admin-start-game', { rounds, hearts: data.heartsCount })
                }
            }
        })

        socket.on('game-next-round', (data: {round: number}) => {
            currentRound = data.round
            const startTime = Date.now()
            rounds[data.round].startTime = startTime
            
            socket.broadcast.emit('clients-to-round', { round: currentRound, startTime })
            socket.emit('admin-to-round', { round: currentRound, startTime })
        })

        socket.on('user-choice-block', (data: { block: number, round: number, playerID: PlayerID }) => {
            // if(gameIsStart){
                // TODO: cleaning
                rounds[data.round].blocksData.map((block, i) => {
                    const playerTarget = block.players.find(p => p == data.playerID)
                    if(playerTarget) rounds[data.round].blocksData[i].players.splice(rounds[data.round].blocksData[i].players.indexOf(playerTarget), 1)
                })

                rounds[data.round].blocksData[data.block].players.push(data.playerID)
                // console.log(rounds[data.round].blocksData);

                socket.broadcast.emit('clients-update-block-data', { blockData: rounds[data.round].blocksData })
                
            // }
        })

        socket.on('game-get-results' , (data: {round: number}) => {
            const roundBlocksPlayersCount:Array<number> = []

            rounds[data.round].blocksData.forEach(block => {
                if(rounds[data.round].zeroBlocks) roundBlocksPlayersCount.push(block.players.length)
                else{
                    if(block.players.length > 0) roundBlocksPlayersCount.push(block.players.length)
                }
            })
            const findMinBlock = (roundBlocksData:Array<number>) => roundBlocksData.reduce((x, y) => Math.min(x, y) )

            const minBlockData = roundBlocksPlayersCount.length == 1 ? roundBlocksPlayersCount[0] :findMinBlock(roundBlocksPlayersCount)
            const blockTarget = rounds[data.round].blocksData.find( block => block.players.length === minBlockData)

            if(blockTarget){
                console.log(blockTarget)
                const winnersUsers:Array<PlayerID> = []
                const losersUsers:Array<Pick<PlayerI, 'playerID' | 'role'>> = []

                // Hearts+
                blockTarget.players.forEach( player => {
                    const playerTarget = players.find( p => p.playerID === player)
                    if(playerTarget){
                        winnersUsers.push(playerTarget.playerID)
                        const playerIndex = players.indexOf(playerTarget)
                        players[playerIndex].hearts++
                    }
                })
            
                // Hearts-
                const losersBlocksData = [...rounds[data.round].blocksData]
                losersBlocksData.splice(losersBlocksData.indexOf(blockTarget), 1)
                console.log(losersBlocksData);

                losersBlocksData.forEach(losersBlock => {
                    losersBlock.players.forEach(player => {
                        const playerTarget = players.find( p => p.playerID === player)
                        if(playerTarget){
                            const playerData = { playerID: playerTarget.playerID, role: playerTarget.role }
                            const playerIndex = players.indexOf(playerTarget)
                            players[playerIndex].hearts--

                            if(players[playerIndex].hearts === 0){
                                players[playerIndex].role = 'observer'
                                playerData.role = 'observer'
                            }
                            
                            losersUsers.push(playerData)
                        }
                    })
                })
                
                // Emit
                socket.broadcast.emit('clients-show-results', { losersUsers, winnersUsers })
                socket.emit('admin-show-results', { losersUsers, winnersUsers })
                rounds[data.round].isCompleted = true
                
            }
            
        })
        
    })
}