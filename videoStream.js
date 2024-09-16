module.exports = function (RED) {
    function videoStream(config) {

        const createDataURI = function (rawImage) {
            return "data:image/png;base64," + rawImage;//default to png
        }
        RED.nodes.createNode(this, config);
        var node = this;
        node.data = config.data || "";//data
        node.dataType = config.dataType || "msg";
        node.obj_bbox = config.obj_bbox || "[]";
        node.obj_bboxType = config.obj_bboxType || "msg";
        node.obj_conf = config.obj_conf || 0;
        node.obj_confType = config.obj_confType || "msg";
        node.obj_label = config.obj_label || "";
        node.obj_labelType = config.obj_labelType || "msg";
        this.active = config.active;

        node.on("input", function (msg) {

            //first clear any error status
            node.status({});

            if (this.active !== true) {
                node.send(msg);//pass it on & return
                return;
            }

            var nodeStatusError = function (err, msg, statusText) {
                console.error(err);
                node.error(err, msg);
                node.status({ fill: "red", shape: "dot", text: statusText });
            }

            try {
                /* ****************  Get Image Data Parameter **************** */
                var dataInput;
                RED.util.evaluateNodeProperty(node.data, node.dataType, node, msg, (err, value) => {
                    if (err) {
                        nodeStatusError(err, msg, "Error getting Image Data parameter");
                        return;//halt flow!
                    } else {
                        dataInput = value;
                    }
                });
                if (!dataInput) {
                    nodeStatusError("dataInput is empty (Image parameter)", msg, "Error. Image is null");
                    return null;
                }
                dataInput = createDataURI(dataInput);
                
                /* ****************  Get Object Bounding Box Parameter **************** */
                var objBbox;
                RED.util.evaluateNodeProperty(node.obj_bbox, node.obj_bboxType, node, msg, (err, value) => {
                    if (err) {
                        nodeStatusError(err, msg, "Error getting Object Bounding Box parameter");
                        return;//halt flow!
                    } else {
                        var tempBbox = value.match(/\d+/g);
                        tempBbox = (tempBbox !== null ? tempBbox.map(Number) : []);
                        objBbox = tempBbox;
                    }
                });

                /* ****************  Get Object Confidence Detection Box Parameter **************** */
                var objConf;
                RED.util.evaluateNodeProperty(node.obj_conf, node.obj_confType, node, msg, (err, value) => {
                    if (err) {
                        nodeStatusError(err, msg, "Error getting Object Confidence Detection parameter");
                        return;//halt flow!
                    } else {
                        objConf = parseFloat(value);
                    }
                });

                /* ****************  Get Object Label Detection Box Parameter **************** */
                var objLabel;
                RED.util.evaluateNodeProperty(node.obj_label, node.obj_labelType, node, msg, (err, value) => {
                    if (err) {
                        nodeStatusError(err, msg, "Error getting Label Confidence Detection parameter");
                        return;//halt flow!
                    } else {
                        objLabel = value;
                    }
                });

                node.send(msg);//pass it on before displaying
                RED.comms.publish("sscma-client-video-stream", { id: this.id, data: dataInput, obj_bbox: objBbox, obj_conf: objConf, obj_label: objLabel});
            }
            catch (e) {
                nodeStatusError(e, msg, "Error reading image")
            }
        });

        node.on("close", function () {
            RED.comms.publish("sscma-client-video-stream", { id: this.id });
            node.status({});
        });
    }
    RED.nodes.registerType("video stream", videoStream);
    RED.httpAdmin.post("/video-stream/:id/:state", RED.auth.needsPermission("video-stream.write"), function (req, res) {
        var state = req.params.state;
        var node = RED.nodes.getNode(req.params.id);

        if (node === null || typeof node === "undefined") {
            res.sendStatus(404);
            return;
        }

        if (state === "enable") {
            node.active = true;
            res.send('activated');
        }
        else if (state === "disable") {
            node.active = false;
            res.send('deactivated');
        }
        else {
            res.sendStatus(404);
        }
    });
};