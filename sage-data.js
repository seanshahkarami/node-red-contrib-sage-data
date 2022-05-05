module.exports = function (RED) {
    "use strict"

    const got = require("got")

    const queryEndpoint = "https://data.sagecontinuum.org/api/v1/query"
    const queryInterval = 5000

    function SageDataNode(config) {
        RED.nodes.createNode(this, config)
        const node = this
        const filter = JSON.parse(config.filter)
        
        node.queryStart = "-10s"

        node.interval_id = setInterval(function() {
            node.emit("input", {})
        }, queryInterval)

        node.on("input", function (msg, send, done) {
            got.post(queryEndpoint, {
                json: {
                    start: node.queryStart,
                    filter: filter,
                }
            })
            .then(resp => {
                const msgs = resp.body.split("\n").filter(s => s != "").map(JSON.parse)

                if (msgs.length == 0) {
                    done()
                    return
                }

                // sort by timestamp
                msgs.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

                const lastMsg = msgs[msgs.length - 1]
                node.queryStart = lastMsg.timestamp

                msgs.forEach(send)
                done()
            })
            .catch(err => {
                done({"error": err})
            })
        })
    }

    RED.nodes.registerType("sage data", SageDataNode)

    SageDataNode.prototype.close = function () {
        if (this.interval_id != null) {
            clearInterval(this.interval_id)
        }
    }
}
