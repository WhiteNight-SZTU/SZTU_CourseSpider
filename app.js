const puppeteer = require('puppeteer');
const fs = require('fs');
const cheerio = require('cheerio');

console.log("正在验证本地配置环境...");
const content = 'Hello World';
const filePath = 'log.txt';

console.log("正在测试程序读写功能");
fs.writeFile(filePath, content, (err) => {
    if (err) {
        console.error('写入文件时发生错误:', err);
    } else {
        console.log('测试文件已保存成功，正在测试网络连接...');
    }
});

const loginUrl = 'https://auth.sztu.edu.cn/idp/authcenter/ActionAuthChain?entityId=jiaowu';
const targetUrl = 'https://jwxt.sztu.edu.cn/jsxsd/framework/xsMain.htmlx';
const username = 'xxxx'; // 替换为您的用户名
const password = 'xxxx'; // 替换为您的密码
const liSelector = 'li[data-sjcode="NEW_XSD_PYGL_WDKB_XQLLKB"]';
const outputFilePath = 'xskb_list.html'; // 指定保存内容的文件路径

console.log("正在初始化...");

async function simulateLogin() {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.goto(loginUrl);

        await page.type('input[name="j_username"]', username);
        await page.type('input[name="j_password"]', password);

        await page.click('#loginButton');

        await page.waitForNavigation();

        await page.goto(targetUrl);

        await page.waitForTimeout(2000);
        console.log('已连接至教务系统，正在寻找资源...');

        await page.evaluate((selector) => {
            const li = document.querySelector(selector);
            li.click();
        }, liSelector);

        console.log('已触发响应事件，尝试保存网页资源');

        await page.waitForTimeout(2000);

        const content = await page.evaluate(async () => {
            const response = await fetch('https://jwxt.sztu.edu.cn/jsxsd/xskb/xskb_list.do');
            return response.text();
        });
        const $ = cheerio.load(content);
        const timetableContent = $('#timetable').html();
        const courses = [];

        const tdElements = $('td');

        tdElements.each((index, tdElement) => {
            const divElements = $(tdElement).find('div');

            divElements.each((index, divElement) => {
                const fontElements = $(divElement).find('font');

                const course = {
                    '课程名称': $(fontElements[0]).text(),
                    '任课教师': $(fontElements[1]).text(),
                    '课程周次': extractCourseWeek($(fontElements[2]).text()),
                    '上课地点': $(fontElements[3]).text(),
                    '上课教室': $(fontElements[4]).text(),
                    '上课节次': extractCourseTime($(fontElements[2]).text()),
                };

                const isEmpty = Object.values(course).every((value) => value.trim() === '');

                if (!isEmpty && course['上课地点'].trim() !== '' && course['上课教室'].trim() !== '') {
                    courses.push(course);
                }
            });
        });

        const courseListByWeek = groupCoursesByWeek(courses);

        fs.writeFileSync('timetable.json', JSON.stringify(courseListByWeek, null, 2));
        console.log('已保存筛选后的课程文件（json）');

        fs.writeFileSync(outputFilePath, timetableContent);
        console.log('html内容已保存到文件:', outputFilePath);


        await browser.close();
        check();

    } catch (error) {
        console.error('登录失败:', error);
    }
}

function extractCourseWeek(weekString) {
    const match = weekString.match(/\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*(?:\(周\)|\(双周\)|\(单周\))/);
    return match ? match[0] : '';
}


function extractCourseTime(timeString) {
    const match = timeString.match(/\[(.*?)\]/);
    return match ? match[1] : '';
}


function extractWeekRange(weekString) {
    const ranges = weekString.split(',');
    const weekRange = [];

    ranges.forEach((range) => {
        const match = range.match(/(\d+)(?:-(\d+))?/);
        const startWeek = parseInt(match[1]);
        const endWeek = match[2] ? parseInt(match[2]) : startWeek;
        for (let i = startWeek; i <= endWeek; i++) {
            weekRange.push(i);
        }
    });

    return weekRange;
}

function generateWeekList(weekRange) {
    const weekList = [];

    weekRange.forEach((week) => {
        weekList.push(`${week}`);
    });

    return weekList;
}


function groupCoursesByWeek(courses) {
    const courseListByWeek = {};

    courses.forEach((course) => {
        const weekString = course['课程周次'];
        const weekRange = extractWeekRange(weekString);
        const weekList = generateWeekList(weekRange);

        weekList.forEach((week) => {
            const weekString = `第${week}周`;
            if (!courseListByWeek[weekString]) {
                courseListByWeek[weekString] = [];
            }
            courseListByWeek[weekString].push(course);
        });
    });

    return courseListByWeek;
}

function check() {
    if (fs.existsSync('timetable.json') && fs.existsSync(outputFilePath)) {
        console.log('程序已成功运行，请检查生成的文件:', 'timetable.json', outputFilePath);
    } else {
        console.log('程序运行失败，请检查错误信息');
    }
}

simulateLogin();
