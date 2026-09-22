// ==UserScript==
// @name         浙工大正方导出 ICS 日程
// @namespace    https://github.com/xlle-er/gdjwkcb_ical
// @version      4.1.11
// @description  通过对正方教务系统的课表页面的解析，实现导出一个适用于大部分 ics 日历的文件
// @author       Xiaolele_er & 1208nn (修改自 31415926535x )
// @supportURL   https://github.com/xlle-er/gdjwkcb_ical/issues
// @license      MIT
// @include      *://www.gdjw.zjut.edu.cn/jwglxt*
// @include      *://www.gdjwjf.zjut.edu.cn/jwglxt*
// @run-at       document-end
// @downloadURL  https://github.com/xlle-er/gdjwkcb_ical/raw/main/script.user.js
// @updateURL    https://github.com/xlle-er/gdjwkcb_ical/raw/main/script.user.js
// ==/UserScript==

//#region 全局配置
// 学期周数，默认为 16
var semesterWeeks = 16;

// 课堂时间表
var classTimeTable = {
  1: { start: "0800", end: "0845" },
  2: { start: "0855", end: "0940" },
  3: { start: "0955", end: "1040" },
  4: { start: "1050", end: "1135" },
  5: { start: "1150", end: "1235" },
  6: { start: "1330", end: "1415" },
  7: { start: "1425", end: "1510" },
  8: { start: "1525", end: "1610" },
  9: { start: "1620", end: "1705" },
  10: { start: "1830", end: "1915" },
  11: { start: "1925", end: "2010" },
  12: { start: "2025", end: "2110" },
};

// 根据自己学校教务系统的网址修改，应该对于新版教务系统的地址都是一样的，故只需修改上面 include 中的教务系统地址即可
var classScheduleToICSURL = "kbcx/xskbcx_cxXskbcxIndex.html"; // 学生课表查询页面，将该学期的课程信息导出为 ics
var examScheduleToICSURL = "kwgl/kscx_cxXsksxxIndex.html"; // 考试信息查询页面，将该学期的考试信息导出为 ics
var studentEvaluationURL = "xspjgl/kcgcpj_cxKcgcpjxxIndex.html"; // 学生评教页面
var LocationPrefix = "浙江工业大学 ";
var startDelay = 4000; // 脚本实际开始运行的延迟时间，网络不好建议调大，1000 等于 1s

//#endregion

//#region 入口
(function () {
  "use strict";

  console.log("Fucking ZhengFang...");
  window.addEventListener("load", () => {
    const url = window.location.href;
    if (url.includes(classScheduleToICSURL)) {
      classScheduleToICS();
    } else if (url.includes(examScheduleToICSURL)) {
      examScheduleToICS();
    } else if (url.includes(studentEvaluationURL)) {
      $("#btn_yd").on("click", () => setTimeout(studentEvaluation, startDelay));
    }
  });
})();

//#endregion

//#region 课程表导出
function classScheduleToICS() {
  console.log("classScheduleToICS");

  //#region 添加相应按钮
  // 加载正方 UI WdatePicker 脚本和样式
  $("head").append(
    $("<script>", {
      type: "text/javascript",
      src: "/zftal-ui-v5-1.0.2/assets/plugins/My97DatePicker/WdatePicker.js?ver=29539157",
    }),
  );
  $("head").append(
    $("<link>", {
      href: "/zftal-ui-v5-1.0.2/assets/plugins/My97DatePicker/skin/WdatePicker.css",
      rel: "stylesheet",
      type: "text/css",
    }),
  );

  let $firstMondayLabel = $("<label>")
    .css("float", "left")
    .append($("<span>").addClass("bigger-120 glyphicon glyphicon-time"))
    .append(" 开学首个星期一");
  let $firstMondaySelector = $("<input>", { type: "text" })
    .addClass("form-control")
    .css({ width: "150px", display: "inline-block", float: "left" })
    .on("focus", function () {
      unsafeWindow.WdatePicker({
        dateFmt: "yyyy-MM-dd",
        readOnly: true,
        lang: "zh-cn",
      });
    })
    .val(
      ((d) => (d.setDate(d.getDate() - d.getDay() + 1), d))(new Date())
        .toISOString()
        .split("T")[0],
    ); // 默认为本周的星期一
  let $weekToggleBtn = $("<button>")
    .addClass("btn btn-default btn-primary") // 默认启用
    .css("float", "left")
    .on("click", function () {
      $(this).toggleClass("btn-primary");
    })
    .append($("<span>").addClass("bigger-120 glyphicon glyphicon-cog"))
    .append(" 在导出的课表内显示周数");
  let $exportBtn = $("<button>")
    .addClass("btn btn-default")
    .css("float", "left")
    .on("click", function () {
      startDate = $firstMondaySelector.val();
      generateCalendar(
        parseCourses(parseTable()),
        $weekToggleBtn.hasClass("btn-primary"),
      );
      alert(
        "ICS 文件已经生成，可以导入到您所使用的日历文件。\n您可以按 Ctrl+J 快捷键来查看浏览器下载或打开系统下载目录查看导出的文件。\nGoogle Calendar 需要自行设置课程的颜色。",
      );
    })
    .append($("<span>").addClass("bigger-120 glyphicon glyphicon-export"))
    .append(" 导出课表");

  $(".btn-toolbar.pull-right")
    .first()
    .append(
      $firstMondayLabel,
      $firstMondaySelector,
      $weekToggleBtn,
      $exportBtn,
    );
  //#endregion

  // 本学期设定的开始日期
  var startDate;

  // Week 双向映射（数字 ↔ 英文星期名）
  const Week = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7,
  };
  Object.keys(Week).forEach((k) => (Week[Week[k]] = k));

  // 从页面中获取课程的 div，返回对应星期及 div 数组
  function parseTable() {
    let week = [],
      divs = [];
    $("#kbgrid_table_0 td[id]").each(function () {
      let $td = $(this);
      if ($td.children().length > 0) {
        let div = $td.find("div").toArray();
        divs = divs.concat(div);
        let wk = Week[$td.attr("id")[0]];
        for (let i = 0; i < div.length; ++i) week.push(wk);
      }
    });
    return { week, divs };
  }

  // 课程信息类
  class Course {
    constructor(course) {
      if (course) Object.assign(this, course);
    }
  }

  // 解析所有课程信息，存入 courses 数组
  function parseCourses(data) {
    var courses = [];
    for (let i = 0; i < data.divs.length; ++i) {
      let course = new Course();
      course.week = data.week[i];
      let $div = $(data.divs[i]);
      course.name = $div.find("span:first font:first").text().slice(0, -1);
      $div.find("p").each(function () {
        let $p = $(this);
        let title = $p.find("span:first").attr("title");
        let val = $.trim($p.find("font").eq(1).text());
        if (title == "节/周") {
          // 解析起始周数及持续节次
          course.info = val;
          let time = val.substring(val.indexOf("(") + 1, val.indexOf(")"));
          let wk = val.substring(val.indexOf(")") + 1).split(",");
          course.startTime = parseInt(time.substring(0, time.indexOf("-")));
          course.endTime = parseInt(
            time.substring(time.indexOf("-") + 1, time.indexOf("节")),
          );
          course.isSingleOrDouble = [];
          course.startWeek = [];
          course.endWeek = [];
          wk.forEach((w) => {
            course.isSingleOrDouble.push(
              w.indexOf("单") != -1 || w.indexOf("双") != -1 ? 2 : 1,
            );
            let startWeek, endWeek;
            if (w.indexOf("-") == -1) {
              startWeek = endWeek = parseInt(w.substring(0, w.indexOf("周")));
            } else {
              startWeek = parseInt(w.substring(0, w.indexOf("-")));
              endWeek = parseInt(
                w.substring(w.indexOf("-") + 1, w.indexOf("周")),
              );
            }
            course.startWeek.push(startWeek);
            course.endWeek.push(endWeek);
          });
        } else if (title == "上课地点")
          course.location = LocationPrefix + val;
        else if (title == "教师 ")
          course.teacher = val;
        else if (title == "教学班名称")
          course.className = val;
      });
      courses.push(course);
    }
    return courses;
  }

  // 根据节次获取具体时间字符串
  function getTime(num, startOrEnd) {
    return classTimeTable[num][startOrEnd == 0 ? "start" : "end"] + "00";
  }

  function getFixedLen(s, len) {
    if (s.length < len) return getFixedLen("0" + s, len);
    return s.slice(0, len);
  }

  // 根据周数和星期获取具体日期（相对学期开始的那一周）
  function getDate(num, wk) {
    let date = new Date(startDate.toString());
    date.setDate(date.getDate() + (num - 1) * 7 + Week[wk] - 1);
    return (
      getFixedLen(date.getUTCFullYear().toString(), 4) +
      getFixedLen((date.getUTCMonth() + 1).toString(), 2) +
      getFixedLen(date.getUTCDate().toString(), 2) +
      "T"
    );
  }

  // 由解析后的课程信息生成 ICS 日历对象
  function generateCalendar(courses, enableWeekEvents) {
    let res = new ICS();
    console.log(courses);
    courses.forEach((course) => {
      for (let i = 0; i < course.isSingleOrDouble.length; ++i) {
        let classTime = course.info.substring(
          course.info.indexOf("(") + 1,
          course.info.indexOf(")"),
        );
        let e = new ICSEvent(
          getDate(course.startWeek[i], course.week) +
          getTime(course.startTime, 0),
          getDate(course.startWeek[i], course.week) +
          getTime(course.endTime, 1),
          course.name,
          course.location,
          `${course.teacher} ${classTime} ${course.className}`,
        );
        e.setRRULE(
          "WEEKLY",
          res.Calendar.WKST,
          (course.endWeek[i] -
            course.startWeek[i] +
            course.isSingleOrDouble[i]) /
          course.isSingleOrDouble[i],
          course.isSingleOrDouble[i],
          course.week.substr(0, 2).toUpperCase(),
        );
        res.pushEvent(e);
      }
    });

    // 建立周数标记事件，持续 semesterWeeks 周（根据开关状态决定是否启用）
    if (enableWeekEvents) {
      for (let i = 1; i <= semesterWeeks; ++i) {
        res.pushEvent(
          new ICSEvent(
            getDate(i, Week[1]) + "060000",
            getDate(i, Week[1]) + "070000",
            "第" + i + "周",
          ),
        );
      }
    }

    res.exportIcs();
  }
}
//#endregion

//#region 考试信息导出
function examScheduleToICS() {
  console.log("examScheduleToICS");

  $(".col-sm-12")
    .eq(1)
    .append(
      $("<button>")
        .addClass("btn btn-primary btn-sm")
        .text("导出 ICS 文件")
        .on("click", function () {
          generateCalendar();
          alert(
            "ICS 文件已经生成，可以导入到您所使用的日历文件。\n您可以按 Ctrl+J 快捷键来查看浏览器下载或打开系统下载目录查看导出的文件。\nGoogle Calendar 需要自行设置课程的颜色。",
          );
        }),
    );
  $("#search_go").trigger("click");

  function generateCalendar() {
    class Exam {
      constructor(e) {
        if (e) Object.assign(this, e);
      }
    }
    let exams = [];
    $("#tabGrid tr:gt(0)").each(function () {
      let exam = new Exam();
      $(this)
        .find("td")
        .each(function () {
          let $td = $(this);
          let attr = $td.attr("aria-describedby");
          let text = $td.text();
          if (attr == "tabGrid_kcmc")
            exam.course = text; // 课程名称
          else if (attr == "tabGrid_ksmc")
            exam.examName = text; // 考试类型
          else if (attr == "tabGrid_cdmc")
            exam.location = text; // 考试地点
          else if (attr == "tabGrid_cdxqmc")
            exam.campus = text; // 校区
          else if (attr == "tabGrid_zwh")
            exam.seat = "座位号 " + text; // 座位号
          else if (attr == "tabGrid_kssj") {
            // 考试时间
            let date =
              text.slice(0, 4) + text.slice(5, 7) + text.slice(8, 10) + "T";
            exam.timeS = date + text.slice(11, 13) + text.slice(14, 16) + "00";
            exam.timeE = date + text.slice(17, 19) + text.slice(20, 22) + "00";
          }
        });
      exams.push(exam);
    });
    console.log(exams);
    let ics = new ICS();
    exams.forEach((ex) => {
      ics.pushEvent(
        new ICSEvent(
          ex.timeS,
          ex.timeE,
          ex.course + " " + ex.examName,
          LocationPrefix + ex.campus + " " + ex.location,
          ex.seat,
        ),
      );
    });

    ics.exportIcs();
  }
}
//#endregion

//#region 一键评教
function studentEvaluation() {
  console.log("studentEvaluation");

  // 添加批量打分的选择区域
  let $panel_body1 = $(".panel.panel-default").eq(1);
  let $panel_body2 = $(".panel-body").eq(3);
  let $blockquote = $panel_body2.find("blockquote:first").clone();
  $blockquote.find("p:first").text("一键评价");
  let $table = $panel_body2
    .find("table:first")
    .clone()
    .removeAttr("data-pjzbxm_id")
    .removeAttr("data-qzz");
  let $tbody = $table.find("tbody:first");
  let $tr = $tbody.find("tr:first");
  $tbody.find("tr:gt(0)").remove();
  $tr
    .removeAttr("data-zsmbmcb_id")
    .removeAttr("data-pjzbxm_id")
    .removeAttr("data-pfdjdmb_id");
  $tr.find("td:first").text("选择的最高分:");
  let $inputs = $tr.find(".radio-pjf");
  $inputs
    .slice(0, 5)
    .removeAttr("name")
    .removeAttr("data-pfdjdmxmb_id")
    .attr("name", "studentEvaluation");
  $inputs.eq(0).attr("checked", "checked");

  let $btn = $("<button>")
    .addClass("btn btn-default")
    .attr("id", "btn_studentEvaluation")
    .append($("<span>").addClass("bigger-120 glyphicon glyphicon-ok"))
    .append(" 一键评价")
    .on("click", function () {
      let score = 5;
      $("[name='studentEvaluation']").each(function () {
        if ($(this).prop("checked")) score = $(this).attr("data-dyf");
      });
      console.log("设置的最高分数为: " + score);
      score = 5 - score;
      let $allInputs = $(".panel-body").eq(3).find("input");
      let flag = Math.round(Math.random() * ($allInputs.length / 5));
      console.log(flag);
      for (let i = score; i < $allInputs.length; i += 5) {
        $allInputs
          .eq(Math.round(i / 5) == flag ? i + 1 : i)
          .attr("checked", "checked");
      }
    });
  $tr.append($("<td>").append($btn));
  $panel_body1.prepend($table).prepend($blockquote);
}
//#endregion

//#region ICS 日历类
var CRLF = "\n";
var SPACE = " ";
class ICS {
  constructor() {
    // 日历主要参数：PRODID、VERSION、CALSCALE、是否提醒及提醒时间
    this.Calendar = {
      VERSION: "2.0",
      PRODID: "-//31415926535x Xiaolele_er 1208nn//GDJW2ICS v4.1.5//ZH-CN",
      CALSCALE: "GREGORIAN", // 历法，默认公历
      // TIMEZONE: "Asia/Shanghai", // 时区，默认上海
      // ISVALARM: false, // 是否开启提醒，默认关闭
      // VALARM: "-PT5M", // 提前提醒时间
      // WKST: "SU", // 一周起始，默认周日
    };
    this.ics = [
      "BEGIN:VCALENDAR",
      "VERSION:" + this.Calendar.VERSION,
      "PRODID:" + this.Calendar.PRODID,
      "CALSCALE:" + this.Calendar.CALSCALE,
      CRLF,
    ];
  }

  // 添加事件
  pushEvent(e) {
    this.ics.push("BEGIN:VEVENT", e.getDTSTART(), e.getDTEND());
    if (e.isrrule) this.ics.push(e.getRRULE());
    this.ics.push(e.getSUMMARY());
    if (this.Calendar.ISVALARM) this.pushAlarm();
    this.ics.push(e.getLOCATION(), e.getDESCRIPTION(), "END:VEVENT", "");
  }

  // 添加提醒
  pushAlarm() {
    this.ics.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:This is an event reminder",
      "TRIGGER:" + this.Calendar.VALARM,
      "END:VALARM",
    );
  }

  // 格式化 ICS 文件内容，按照 ICS 规范每行不超过 75 字节，超过部分需要换行并在下一行开头添加一个空格
  getFixedIcs() {
    const e = new TextEncoder();
    return (this.res =
      (this.ics.push("END:VCALENDAR"),
        this.ics
          .map((l) => {
            for (
              var r = [];
              e.encode(l).length > 75;
              r.push(l.slice(0, p)), l = SPACE + l.slice(p)
            )
              for (var p = l.length; p && e.encode(l.slice(0, p)).length > 75;)
                p--;
            return (r.push(l), r.join(CRLF));
          })
          .join(CRLF) + CRLF));
  }

  // 导出 ics 文件
  exportIcs() {
    this.getFixedIcs();
    // 使用 <a> 标签模拟下载，Blob 实现流文件的下载链接转化
    $("<a>")
      .attr({
        href: URL.createObjectURL(
          new Blob([this.res], { type: "text/x-vCalendar" }),
        ),
        download: "courses.ics",
      })[0]
      .click();
  }
}
//#endregion

//#region ICS 事件类
class ICSEvent {
  constructor(DTSTART, DTEND, SUMMARY, LOCATION = "", DESCRIPTION = "") {
    this.DTSTART = DTSTART;
    this.DTEND = DTEND;
    this.SUMMARY = SUMMARY;
    this.LOCATION = LOCATION;
    this.DESCRIPTION = DESCRIPTION;
    this.isrrule = false;
  }
  setRRULE(FREQ, WKST, COUNT, INTERVAL, BYDAY) {
    this.isrrule = true;
    this.RRULE = `RRULE:FREQ=${FREQ};WKST=${WKST};COUNT=${COUNT};INTERVAL=${INTERVAL};BYDAY=${BYDAY}`;
  }
  getRRULE() {
    return this.RRULE;
  }
  getDTSTART() {
    return "DTSTART:" + this.DTSTART;
  }
  getDTEND() {
    return "DTEND:" + this.DTEND;
  }
  getSUMMARY() {
    return "SUMMARY:" + this.SUMMARY;
  }
  getLOCATION() {
    return "LOCATION:" + this.LOCATION;
  }
  getDESCRIPTION() {
    return "DESCRIPTION:" + this.DESCRIPTION;
  }
}
//#endregion
