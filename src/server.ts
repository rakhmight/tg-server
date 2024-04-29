
import { FastifyError } from "fastify";
import getHostAddress from "./utils/getHostAddress";

const { build } = require("./app.js");
const { socketServer } = require('./socket')
const { fastifyConfig } = require('./configs')

const app = build(fastifyConfig);

(async () => {
    try {             
        await app.ready((err:FastifyError) => {
          if (err) throw err

          socketServer(app)
        })
        
        await app.listen({port: 6565, host: getHostAddress() ? getHostAddress() : hostError()})
        .then(()=>{
            app.log.info({ actor: 'TG-Server' }, 'Server started successfully')
        })
    } catch (error) {
        app.log.fatal({ actor: 'TG-Server' }, (error as Error).message);
        process.exit(1);
    }
})()

function hostError(){
    app.log.fatal({ actor: 'TG-Server' }, 'Unable to get ip address of host');
    process.exit(1);
}