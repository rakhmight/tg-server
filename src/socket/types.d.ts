declare interface PlayerI {
    socketID: string,
    playerID: PlayerID,
    address: string,
    name: string,
    hearts: number,
    role: PlayerRole
}

declare type PlayerRole = 'player' | 'admin' | 'observer'

declare type PlayerID = string

declare interface RoundI {
    timer: number,
    blocksCount: number,
    disabledBlocks: number,
    zeroBlocks: boolean,
    pseudoZeroBlocks: boolean,

    blocksData: Array<BlockDataI>,
    isCompleted: boolean,
    startTime: number | undefined
}

declare interface BlockDataI {
    id: number,
    players: Array<PlayerID>
}