﻿const axios = require("axios");
const nodemailer = require("nodemailer");
const notifier = require("node-notifier");
const WindowsToaster = require("node-notifier").WindowsToaster;
// Or
// const WindowsToaster = require('node-notifier/notifiers/toaster');
const constant = require("../utils/constant");
const _ = require("lodash");
const path = require("path");

const messageService = require("../messages/message.service");
const productService = require("../products/product.service");
const userService = require("../users/user.service");
const servicerService = require("../servicers/servicer.service");

const accountSid = "AC0b6ed65b3b28b81e5816eeb39c2e30cd";
const authToken = "a70723aef12d4f42105b145ebfc2ca69";

module.exports = {
  sendNativeNotification,
  sendToasterNotification,
  sendSMSOverHTTP,
  sendSMSOverHTTPA,
  sendMailOverHTTP,
  iotHubMsgProc,
};

const smtptransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "rocket.iot.at@gmail.com",
    pass: "InformYourCostumer",
  },
});

async function sendNativeNotification(params) {
  notifier.notify(
    {
      title: params.title,
      message: params.message,
      appID: "test appID",
      icon: path.join(__dirname, "icon.jpg"),
      sound: "SMS",
      type: "info",
      time: 5000,
      wait: true,
    },
    function (error, response, metadata) {
      console.log(
        "error:",
        error,
        ", ",
        "response:",
        response,
        ", ",
        "metadata:",
        metadata
      );
    }
  );
}

async function sendToasterNotification(params) {
  let windowsToasterNotifier = new WindowsToaster({
    withFallback: true,
  });

  return await windowsToasterNotifier.notify(
    {
      title: "Windows Toaster Notification",
      message: params.message,
      icon: path.join(__dirname, "icon.jpg"),
      type: "warning",
      sound: "SMS",
    },
    function (error, response, metadata) {
      console.log(
        "error:",
        error,
        ", ",
        "response:",
        response,
        ", ",
        "metadata:",
        metadata
      );
    }
  );
}

function sendMailOverHTTP(params) {
  const mailOptions = {
    from: `iot@rocket-at.com`,
    to: params.email,
    subject: params.subject,
    html: params.emailBody,
  };

  return smtptransporter.sendMail(mailOptions);
}

function sendSMSOverHTTP(params) {
  const client = require("twilio")(accountSid, authToken);
  const phone = params.phone;
  const message = params.message;

  const body = `${message}`;

  return client.messages.create({
    body: body,
    from: "+436703082251", //Austria
    to: phone,
  });
}

function sendSMSOverHTTPA(params) {
  return axios.post(
    "https://us-central1-chiplusgo-95ec4.cloudfunctions.net/textmessageV2",
    {
      Phone: params.phone,
      Body: params.message,
      From: "+13462331831", // US
    }
  );
}

async function iotHubMsgProc(params) {
  const log = params.message.log;
  const deviceUID = params.message.ID;
  productService.getByUID({ uid: deviceUID }).then((data) => {
    messageService.createA({ ...params, lift: data.id });
  });

  if (log === "error") {
    const state = params.message.state ? params.message.state : 0;
    const errid = params.message.errid ? params.message.errid : 0;
    const number = log === "info" ? state : log === "error" ? errid : 0;
    const description = constant.descriptions[log][number];

    productService.getByUID({ uid: deviceUID }).then(async (data) => {
      if (data && data.categories) {
        const device = data;
        const address = device.location.address;
        const deviceName = device.name;
        const users = data.categories;
        let promises = [];

        promises.push(
          new Promise((resolve, reject) =>
            users.map(async (userId) => {
              await userService.getById(userId).then(async (userInfo) => {
                if (userInfo) {
                  const email = userInfo.email;

                  if (userInfo.phone) {
                    const phone = userInfo.phone;

                    sendSMSOverHTTP({
                      phone,
                      message: `An error was reported from the ${deviceUID} - ${deviceName} - ${address}. ${description}: ${params.message.text}`,
                    })
                      .then((data) => {
                        resolve(data);
                      })
                      .catch((err) => {
                        resolve(err);
                      });
                  }

                  sendMailOverHTTP({
                    email: email,
                    subject: `Error message from ${deviceUID}`,
                    emailBody: `<h3>An error was reported from the ${deviceUID} - ${deviceName} - ${address}. ${description}: ${params.message.text}</h3>`,
                  })
                    .then((data) => {
                      resolve(data);
                    })
                    .catch((err) => {
                      resolve(err);
                    });

                  console.log("-----", email);
                }
              });
            })
          )
        );

        Promise.all(promises).then(() => {
          console.log("-----Customer Promise.all->", "OK");

          promises = [];
          servicerService.getAll().then(async (data) => {
            const deviceId = device._id;

            const servicers = _.filter(data, (item) =>
              item.devices.includes(deviceId)
            );

            promises.push(
              new Promise((resolve, reject) =>
                servicers.map(async (servicerInfo) => {
                  await servicerService
                    .getById(servicerInfo.id)
                    .then(async (userInfo) => {
                      if (userInfo) {
                        const email = userInfo.email;
                        const type = userInfo.type;

                        if (userInfo.phone && (type === 0 || type === 2)) {
                          const phone = userInfo.phone;

                          sendSMSOverHTTP({
                            phone,
                            message: `An error was reported from the ${deviceUID} - ${deviceName} - ${address}. ${description}: ${params.message.text}`,
                          })
                            .then((data) => {
                              resolve(data);
                            })
                            .catch((err) => {
                              resolve(err);
                            });
                        }

                        if (type === 0 || type === 1) {
                          sendMailOverHTTP({
                            email: email,
                            subject: `Error message from ${deviceUID}`,
                            emailBody: `<h3>An error was reported from the ${deviceUID} - ${deviceName} - ${address}. ${description}: ${params.message.text}</h3>`,
                          })
                            .then((data) => {
                              resolve(data);
                            })
                            .catch((err) => {
                              resolve(err);
                            });
                        }
                      }
                    });
                })
              )
            );

            Promise.all(promises).then(() => {
              console.log("Servicer Promise.all->", "OK");
            });
          });
        });
      }
    });
  }
}
