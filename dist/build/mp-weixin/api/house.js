"use strict";const e=require("../utils/request.js");exports.getHouseDetailApi=t=>e.request({method:"GET",url:"/portal/housepage/get/nologin",data:{houseId:t}});
