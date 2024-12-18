// ==UserScript==
// @name         浙工大-正方教务系统导出课程表
// @namespace    https://github.com/31415926535x/CollegeProjectBackup/tree/master/ZhengfangClassScheduleToICS
// @version      4.1.3
// @description  通过对正方教务系统的课表页面的解析，实现导出一个适用于大部分ics日历的文件，理论使用于所有使用新版正方教务系统（可对 ``include`` 进行一定的修改以适用不同的学校的链接）
// @author       Xiaolele_er (修改自 31415926535x )
// @supportURL   https://github.com/31415926535x/CollegeProjectBackup/blob/master/ZhengfangClassScheduleToICS/Readme.md
// @compatible   chrome
// @compatible   firefox
// @license      MIT
// @include      *://www.gdjw.zjut.edu.cn/jwglxt*
// @include      *://gdjw.zjut.edu.cn/jwglxt/kbcx/xskbcx_cxXskbcxIndex.html*
// @run-at       document-start
// @downloadURL https://update.greasyfork.org/scripts/410725/%E5%8D%97%E4%BF%A1%E9%99%A2-%E6%96%B0%E7%89%88%E6%AD%A3%E6%96%B9%E6%95%99%E5%8A%A1%E7%B3%BB%E7%BB%9F%E5%AF%BC%E5%87%BA%E8%AF%BE%E7%A8%8B%E8%A1%A8.user.js
// @updateURL https://update.greasyfork.org/scripts/410725/%E5%8D%97%E4%BF%A1%E9%99%A2-%E6%96%B0%E7%89%88%E6%AD%A3%E6%96%B9%E6%95%99%E5%8A%A1%E7%B3%BB%E7%BB%9F%E5%AF%BC%E5%87%BA%E8%AF%BE%E7%A8%8B%E8%A1%A8.meta.js
// ==/UserScript==

// 学期周数 默认为16
var weeks = 16

// 课堂时间表
var classtime = {
    '1': { 'start': '0800', 'end': '0845' },
    '2': { 'start': '0855', 'end': '0940' },
    '3': { 'start': '0955', 'end': '1040' },
    '4': { 'start': '1050', 'end': '1135' },
    '5': { 'start': '1150', 'end': '1235' },
    '6': { 'start': '1330', 'end': '1415' },
    '7': { 'start': '1425', 'end': '1510' },
    '8': { 'start': '1525', 'end': '1610' },
    '9': { 'start': '1620', 'end': '1705' },
    '10': { 'start': '1830', 'end': '1915' },
    '11': { 'start': '1925', 'end': '2010' },
    '12':{'start': '2025','end':'2110'}
};
// 根据自己学校教务系统的网址修改，应该对于新版教务系统的地址都是一样的，故只需修改上面 include中的教务系统的地址即可
var ClassScheduleToICSURL = "kbcx/xskbcx_cxXskbcxIndex.html"; // 学生课表查询页面，将该学期的课程信息导出为ics
var ExamScheduleToICSURL = "kwgl/kscx_cxXsksxxIndex.html"; // 考试信息查询页面，将该学期的考试信息导出为ics
var StudentEvalutionURL = "xspjgl/xspj_cxXspjIndex.html"; // 学生评教页面


var setTimeout_ = 4000; // 设置脚本实际运行的开始时间，网络不好建议时间稍长，1000等于1s
(function() {

    'use strict';

    console.log("Script running.....");
    unsafeWindow.addEventListener("load", main);

})();

function main() {
    var windowURL = window.location.href;
    if (windowURL.indexOf(ClassScheduleToICSURL) != -1) {
        ClassScheduleToICS();
    } else if (windowURL.indexOf(ExamScheduleToICSURL) != -1) {
        ExamScheduleToICS();
    } else if (windowURL.indexOf(StudentEvalutionURL) != -1) {
        // StudentEvalution();
        // unsafeWindow.addEventListener("load", StudentEvalution);
        document.getElementById("btn_yd").onclick = function() {
            window.setTimeout(StudentEvalution, setTimeout_);
        }
    }
}

function ClassScheduleToICS() {
    console.log("ClassScheduleToICS");
    // 在课表上方创建一个点击按钮
    // --------------------------------------------------------------------------
    // unsafeWindow.addEventListener ("load", pageFullyLoaded);
    pageFullyLoaded();
    //加载完成后运行
    function pageFullyLoaded() {
        console.log("Fucking ZhengFang...");
        let div = document.getElementsByClassName("btn-toolbar pull-right")[0];
        let btn = document.createElement("button");
        btn.className = "btn btn-default";
        btn.id = "exportbtn";
        let sp = document.createElement("span");
        sp.innerText = "生成课表";
        sp.className = "bigger-120 glyphicon glyphicon-file";
        btn.append(sp);

        let dwnbtn = document.createElement("button");
        dwnbtn.className = "btn btn-default";
        sp = document.createElement("span");
        sp.innerText = "选择本学期第一个星期一:";
        sp.className = "bigger-120 glyphicon glyphicon-time";
        dwnbtn.appendChild(sp);
        let StartDate = document.createElement("input");
        StartDate.type = "date";
        StartDate.value = "2020-01-01";
        div.appendChild(btn);
        dwnbtn.appendChild(StartDate);
        div.appendChild(dwnbtn);


        btn.onclick = function() {
            startDate = StartDate.value;
            generateCalendar(parseCourses(parseTable())); // 嘿嘿。。
            alert("ics文件已经生成，请导入到您所使用的日历文件；（Google Calendar需要自行设置课程的颜色。。。）");
        }
    }
    // --------------------------------------------------------------------------

    // 本学期设定的开始日期
    var startDate;

    // 全局变量Week的双引射
    // --------------------------------------------------------------------------
    var Week;
    (function(Week) {
        Week[Week["Monday"] = 1] = "Monday";
        Week[Week["TuesDay"] = 2] = "TuesDay";
        Week[Week["Wednesday"] = 3] = "Wednesday";
        Week[Week["ThursDay"] = 4] = "ThursDay";
        Week[Week["Friday"] = 5] = "Friday";
        Week[Week["Saturday"] = 6] = "Saturday";
        Week[Week["Sunday"] = 7] = "Sunday";
    })(Week || (Week = {}));
    // --------------------------------------------------------------------------


    // 从页面中获取课程的 div, 返回对应的星期以及div数组
    // --------------------------------------------------------------------------
    function parseTable() {
        let table = document.getElementById("kbgrid_table_0");
        // console.log(table);
        // let tds = table.getElementsByTagName("td");  // 因为 getElementsByTagName() 方法没有foreach 故使用 queryselectorall()
        let tds = table.querySelectorAll("td");
        // console.log(tds);
        let week = new Array();
        let divs = new Array();
        tds.forEach(element => {
            if (element.hasAttribute("id")) {
                if (element.hasChildNodes()) {
                    let div = Array.from(element.getElementsByTagName("div"));
                    // let div = element.querySelectorAll("div");
                    divs = divs.concat(div);
                    let wk = Week[element.getAttribute("id")[0]];
                    for (let i = 0; i < div.length; ++i) {
                        week.push(wk);
                    }
                }
            }
        });
        return { week: week, divs: divs };
    }
    // --------------------------------------------------------------------------




    // --------------------------------------------------------------------------
    // 全局变量 课程信息类
    class Course {
        constructor(course) {
            if (course) {
                this.name = course.name; // 课程名称
                this.week = course.week; // 该课程具体是星期几
                this.info = course.info; // 该课程的一个这个时段的信息
                this.startTime = course.startTime; // 该课程的开始上课时间
                this.endTime = course.endTime;
                this.startWeek = course.startWeek; // 该课程的持续上课的起始周，为一个数组
                this.endWeek = course.endWeek;
                this.isSingleOrDouble = course.isSingleOrDouble;
                // 改课程是否是间隔上课，间隔为2
                this.location = course.location; // 该课程的上课地点
                this.teacher = course.teacher; // 该课程的任课老师
            }
        }
    }
    // --------------------------------------------------------------------------


    // 获取所有的课程信息，存放到一个 courses 数组中
    // --------------------------------------------------------------------------
    function parseCourses(data) {
        var courses = new Array();
        for (let i = 0; i < data.divs.length; ++i) {
            let course = new Course();
            course.week = data.week[i];
            course.name = data.divs[i].getElementsByTagName("span")[0].getElementsByTagName("font")[0].innerText;
            course.name = course.name.substr(0, course.name.length - 1);
            data.divs[i].querySelectorAll("p").forEach(p => {
                if (p.getElementsByTagName("span")[0].getAttribute("title") == "节/周") {
                    // 进行起始周数以及持续时间的解析
                    (function(str = p.getElementsByTagName("font")[1].innerText) {
                        course.info = $.trim(str);
                        // console.log(str);
                        let time = str.substring(str.indexOf("(") + 1, str.indexOf(")") + 1 - 1);
                        let wk = str.substring(str.indexOf(")") + 1, str.length).split(",");
                        // console.log(time);
                        // console.log(wk);

                        course.startTime = parseInt(time.substring(0, time.indexOf("-")));
                        course.endTime = parseInt(time.substring(time.indexOf("-") + 1, time.indexOf("节")));


                        course.isSingleOrDouble = new Array();
                        course.startWeek = new Array();
                        course.endWeek = new Array();
                        wk.forEach(w => {
                            if (w.indexOf("单") != -1 || w.indexOf("双") != -1) {
                                course.isSingleOrDouble.push(2);
                            } else {
                                course.isSingleOrDouble.push(1);
                            }

                            let startWeek, endWeek;
                            if (w.indexOf("-") == -1) {
                                startWeek = endWeek = parseInt(w.substring(0, w.indexOf("周")));
                            } else {
                                startWeek = parseInt(w.substring(0, w.indexOf("-")));
                                endWeek = parseInt(w.substring(w.indexOf("-") + 1, w.indexOf("周")));
                            }
                            course.startWeek.push(startWeek);
                            course.endWeek.push(endWeek);
                        });
                    })();

                } else if (p.getElementsByTagName("span")[0].getAttribute("title") == "上课地点") {
                    course.location = $.trim(p.getElementsByTagName("font")[1].innerText);
                } else if (p.getElementsByTagName("span")[0].getAttribute("title") == "教师") {
                    course.teacher = $.trim(p.getElementsByTagName("font")[1].innerText);
                }
            });
            // console.log(course);
            courses.push(course);
        }
        return courses;
    }
    // --------------------------------------------------------------------------




    // --------------------------------------------------------------------------
    // 通过节次确定时间， 默认每天上午8点上课，每节课两小时（无休息时间），下午2点上课
    function getTime(num, StartOrEnd) {
        if (StartOrEnd == 0) {
            time = classtime[num]["start"]
        } else {
            time = classtime[num]["end"]
        }
        return time + '00';
    }

    function getFixedLen(s, len) {
        if (s.length < len) {
            return getFixedLen("0" + s, len);
        } else if (s.length > len) {
            return s.slice(0, len);
        } else {
            return s;
        }
    }
    // 通过周数获得具体的日期（相对学期开始的那一周）
    function getDate(num, wk) {
        let date = new Date(startDate.toString());
        date.setDate(date.getDate() + (num - 1) * 7 + Week[wk] - 1);
        let res = "";
        res += getFixedLen(date.getUTCFullYear().toString(), 4);
        res += getFixedLen((date.getUTCMonth() + 1).toString(), 2);
        res += getFixedLen(date.getUTCDate().toString(), 2);
        res += "T";
        return res;
    }
    // --------------------------------------------------------------------------

    // --------------------------------------------------------------------------
    // 日历的生成，由处理过的课程信息来得到一个没有处理行长的ics
    function generateCalendar(courses) {
        let res = new ICS();

        // 将每一个课程信息转化为事件 VEVENT 并添加一个提醒
        console.log(courses);
        courses.forEach(course => {
            for (let i = 0; i < course.isSingleOrDouble.length; ++i) {
                let e = new ICSEvent("" + getDate(course.startWeek[i], course.week) + getTime(course.startTime, 0),
                    "" + getDate(course.startWeek[i], course.week) + getTime(course.endTime, 1),
                    // "" + course.name + " " + course.location + " " + course.teacher + " " + course.info);
                    "" + course.name + " " + course.location.substring(5) + " " + course.info.substring(1, 5),
                    "" + course.location,
                    "" + course.info.substring(1, 5) + " " + course.teacher);
                e.setRRULE("WEEKLY", res.Calendar.WKST,
                    "" + (course.endWeek[i] - course.startWeek[i] + course.isSingleOrDouble[i]) / course.isSingleOrDouble[i],
                    "" + course.isSingleOrDouble[i],
                    "" + course.week.substr(0, 2).toUpperCase());
                res.pushEvent(e);
            }
        });

        // 建立一个周数事件，持续20周
        (function() {
            for (let i = 1; i <= weeks; ++i) {
                let e = new ICSEvent("" + getDate(i, Week[1]) + "060000",
                    "" + getDate(i, Week[1]) + "070000",
                    "" + "第" + i + "周");
                res.pushEvent(e);
            }
        })();

        res.pushCalendarEnd();
        res.exportIcs();
    }
    // --------------------------------------------------------------------------
}

// 导出考试信息
function ExamScheduleToICS() {
    console.log("ExamScheduleToICS");

    pageFullyLoaded();
    //加载完成后运行
    function pageFullyLoaded() {
        let div = document.getElementsByClassName("col-sm-12")[1];
        let btn = document.createElement("button");
        btn.className = "btn btn-primary btn-sm";
        btn.id = "exportbtn";
        btn.innerText = "导出ICS文件";

        div.appendChild(btn);


        btn.onclick = function() {
            generateCalendar();
            alert("ics文件已经生成，请导入到您所使用的日历文件；（Google Calendar需要自行设置课程的颜色。。。）");
        }

        document.getElementById("search_go").click();
    }

    function generateCalendar() {
        let table = document.getElementById("tabGrid");
        let trs = table.getElementsByTagName("tr");

        class EXAM {
            constructor(e) {
                if (e) {
                    this.course = e.course; // 课程名
                    this.teacher = e.teacher; // 教师
                    this.examNmae = e.examNmae; // 考试名称：期中还是期末
                    this.timeS = e.timeS; // 考试时间
                    this.timeT = e.timeE; // 考试时间
                    this.location = e.location; // 考试地点组成： 考试地点、考试校区、座位号
                }
            }
        }
        let exams = new Array();
        for (let i = 1; i < trs.length; ++i) {
            let tds = trs[i].getElementsByTagName("td");
            let exam = new EXAM();
            exam.loction = "";
            trs[i].querySelectorAll("td").forEach(tr => {
                let attr = tr.getAttribute("aria-describedby");
                if (attr == "tabGrid_kcmc") {
                    // 课程名称
                    exam.course = tr.innerText;
                } else if (attr == "tabGrid_jsxx") {
                    // 教师
                    exam.teacher = tr.innerText.substring(tr.innerText.indexOf("/") + 1, tr.innerText.length);
                } else if (attr == "tabGrid_ksmc") {
                    // 考试类型
                    exam.examNmae = tr.innerText;
                } else if (attr == "tabGrid_kssj") {
                    // 考试时间
                    let time = tr.innerText;
                    let date = "" + time[0] + time[1] + time[2] + time[3] + time[5] + time[6] + time[8] + time[9] + "T";
                    exam.timeS = date + time[11] + time[12] + time[14] + time[15] + "00";
                    exam.timeE = date + time[17] + time[18] + time[20] + time[21] + "00";
                } else if (attr == "tabGrid_cdmc") {
                    // 考试地点
                    exam.location = tr.innerText;
                } else if (attr == "tabGrid_cdxqmc") {
                    // 校区
                    exam.location += " " + tr.innerText;
                } else if (attr == "tabGrid_zwh") {
                    // 座位号
                    exam.location += "  " + tr.innerText;
                }
                // 可以根据自己学校和自己的喜好添加你想要的信息
            });
            exams.push(exam);
        }
        console.log(exams);
        let ics = new ICS();
        exams.forEach(ex => {
            let e = new ICSEvent("" + ex.timeS, "" + ex.timeE, "" + ex.course + " " + ex.examNmae + " " + ex.teacher + " " + ex.location);
            ics.pushEvent(e);
        });
        ics.pushCalendarEnd();
        ics.exportIcs();
    }
}


function StudentEvalution() {
    // SetBtnZero();
    console.log("done......");
    // let trs = document.getElementById("tempGrid").getElementsByTagName("tr");
    // console.log(trs);
    // for(let i = 0; i < trs.length; ++i){
    //     console.log("2333");
    //     trs[i].onclick = function(){
    //         console.log("???????????");
    //         // ModifyHTML();
    //         setTimeout(ModifyHTML(), 4000);
    //         console.log("!!!!!!!!");
    //     }
    // }
    ModifyHTML();

    function ModifyHTML() {
        console.log("modify...")
            // 添加一个选择要批量打分的选择框
        let panel_body1 = document.getElementsByClassName("panel panel-default")[1];
        let panel_body2 = document.getElementsByClassName("panel-body")[3];
        let blockquote = panel_body2.getElementsByTagName("blockquote")[0].cloneNode(true);
        blockquote.getElementsByTagName("p")[0].innerText = "一键评价";
        let table = panel_body2.getElementsByTagName("table")[0].cloneNode(true);
        table.removeAttribute("data-pjzbxm_id");
        table.removeAttribute("data-qzz");
        let tbody = table.getElementsByTagName("tbody")[0];
        let tr = tbody.getElementsByTagName("tr")[0];
        while (tbody.getElementsByTagName("tr").length > 1) {
            tbody.removeChild(tbody.getElementsByTagName("tr")[1]);
        }
        tr.removeAttribute("data-zsmbmcb_id");
        tr.removeAttribute("data-pjzbxm_id");
        tr.removeAttribute("data-pfdjdmb_id");
        tr.getElementsByTagName("td")[0].innerText = "选择的最高分:";
        let inputs = tr.getElementsByClassName("radio-pjf");
        for (let i = 0; i < 5; ++i) {
            // tds[i].getElementsByTagName("div")[0].getElementsByTagName("div")[0].getElementsByTagName("label")[0].getElementsByTagName("")
            inputs[i].removeAttribute("name");
            inputs[i].removeAttribute("data-pfdjdmxmb_id");
            inputs[i].setAttribute("name", "StudentEvalution");
        }
        inputs[0].setAttribute("checked", "checked");


        // let btn = document.getElementsByClassName("btn-group")[1];
        let btn = document.createElement("button");
        btn.className = "btn btn-default";
        let sp = document.createElement("span");
        sp.innerText = "一键评价";
        sp.className = "bigger-120 glyphicon glyphicon-ok";
        btn.append(sp);
        btn.setAttribute("id", "btn_StudentEvalution");
        btn.onclick = function() {
            let score = 5;
            let checked = document.getElementsByName("StudentEvalution");
            for (let i = 0; i < checked.length; ++i) {
                if (checked[i].checked) {
                    score = checked[i].getAttribute("data-dyf")
                }
            }
            console.log("设置的最高分数为: " + score);
            score = 5 - score;
            let inputs = document.getElementsByClassName("panel-body")[3].getElementsByTagName("input");
            let flag = Math.round(Math.random() * (inputs.length / 5));
            console.log(flag);
            for (let i = score; i < inputs.length; i += 5) {
                if (Math.round(i / 5) == flag) {
                    inputs[i + 1].setAttribute("checked", "checked");
                } else {
                    inputs[i].setAttribute("checked", "checked");
                }
            }
        }
        let td = document.createElement("td");
        td.appendChild(btn);

        tr.appendChild(td);
        panel_body1.prepend(table);
        panel_body1.prepend(blockquote);


    }

}



// ----------------------------------------- 一些基础方法 ----------------------------------------------------//
function SetBtnZero() {
    // 没用，，，
    let btn = document.getElementById("btn_yd");
    btn.className = "btn btn-default btn-primary";
    btn.removeAttribute("disabled");
}

// -------------------------------- ICS类，用于处理所有有关日历的操作 ------------------------------------------//
var CRLF = "\n";
var SPACE = " ";
class ICS {

    Calendar; // 日历参数
    ics; // ics格式的日历，
    res; // 最后格式化的结果

    constructor() {

        // --------------------------------------------------------------------------
        // 日历的一些主要参数，如PRODID、VERSION、CALSCALE、是否提醒以及提醒的时间
        (function(Calendar) {
            Calendar.PRODID = "-//31415926535x//ICalendar Exporter v1.0//CN";
            Calendar.VERSION = "2.0";
            Calendar.CALSCALE = "GREGORIAN"; // 历法，默认是公历
            Calendar.TIMEZONE = "Asia/Shanghai" // 时区，默认是上海
            Calendar.ISVALARM = false; // 提醒，默认是开启
            Calendar.VALARM = "-PT5M"; // 提醒，默认半小时
            Calendar.WKST = "SU"; // 一周开始，默认是周日

        })(this.Calendar || (this.Calendar = {}));
        // --------------------------------------------------------------------------


        this.ics = new Array();
        this.ics.push("BEGIN:VCALENDAR");
        this.ics.push("VERSION:" + this.Calendar.VERSION);
        this.ics.push("PRODID:" + this.Calendar.PRODID);
        this.ics.push("CALSCALE:" + this.Calendar.CALSCALE);
    }

    // 添加事件
    pushEvent(e) {
        this.ics.push("BEGIN:VEVENT");
        this.ics.push(e.getDTSTART());
        this.ics.push(e.getDTEND());
        if (e.isrrule == true) this.ics.push(e.getRRULE());
        this.ics.push(e.getSUMMARY());
        if (this.Calendar.ISVALARM == true) this.pushAlarm();
        this.ics.push(e.getLOCATION());
        this.ics.push(e.getDESCRIPTION());
        this.ics.push("END:VEVENT");
        this.ics.push(CRLF);
    }

    // 添加提醒
    pushAlarm() {
        this.ics.push("BEGIN:VALARM");
        this.ics.push("ACTION:DISPLAY");
        this.ics.push("DESCRIPTION:This is an event reminder");
        this.ics.push("TRIGGER:" + this.Calendar.VALARM);
        this.ics.push("END:VALARM");
    }

    // 添加日历末
    pushCalendarEnd() {
        this.ics.push("END:VCALENDAR");
    }

    // 对ics进行格式的处理，每行不超过75个字节，换行用CRLF，对于超出的进行换行，下一行行首用空格
    getFixedIcs() {
            this.res = "";
            this.ics.forEach(line => {
                if (line.length > 60) {
                    let len = line.length;
                    let index = 0;
                    while (len > 0) {
                        for (let i = 0; i < index; ++i) {
                            this.res += SPACE;
                        }
                        this.res += line.slice(0, 60) + CRLF;
                        line = line.slice(61);
                        len -= 60;
                        ++index;
                    }
                    line = line.slice(0, 60);
                }
                this.res += line + CRLF;
            });
            return this.res;
        }
        // --------------------------------------------------------------------------


    // --------------------------------------------------------------------------
    // 导出ics
    exportIcs() {
            this.getFixedIcs();
            // 使用a标签模拟下载，blob实现流文件的下载链接转化
            let link = window.URL.createObjectURL(new Blob([this.res], {
                type: "text/x-vCalendar"
            }));
            let a = document.createElement("a");
            a.setAttribute("href", link);
            a.setAttribute("download", "courses.ics");
            a.click(); // 模拟下载
        }
        // --------------------------------------------------------------------------
        // -------------------------------- ICS ------------------------------------------//


}
// -------------------------------- ICS类，用于处理所有有关日历的操作 ------------------------------------------//
class ICSEvent {
    constructor(DTSTART, DTEND, SUMMARY, LOCATION, DESCRIPTION) {
        this.DTSTART = DTSTART;
        this.DTEND = DTEND;
        this.SUMMARY = SUMMARY;
        this.LOCATION = (LOCATION == undefined) ? "" : LOCATION;
        this.DESCRIPTION = (DESCRIPTION == undefined) ? "" : DESCRIPTION;
    }
    isrrule = false;
    RRULE;
    setRRULE(FREQ, WKST, COUNT, INTERVAL, BYDAY) {
        this.isrrule = true;
        this.RRULE = "RRULE:FREQ=" + FREQ + ";WKST=" + WKST + ";COUNT=" + COUNT + ";INTERVAL=" + INTERVAL + ";BYDAY=" + BYDAY;
    }
    getRRULE() {
        return "" + this.RRULE;
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

// -------------------------------- ICS类，用于处理所有有关日历的操作 ------------------------------------------//