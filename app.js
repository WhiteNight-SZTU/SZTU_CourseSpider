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

        // 访问登录页面
        await page.goto(loginUrl);

        // 输入用户名和密码
        await page.type('input[name="j_username"]', username);
        await page.type('input[name="j_password"]', password);

        // 点击登录按钮
        await page.click('#loginButton');

        // 等待页面加载完成
        await page.waitForNavigation();

        // 打开目标网页
        await page.goto(targetUrl);

        // 等待一段时间，确保页面内容已加载完毕
        await page.waitForTimeout(2000);
        console.log('已连接至教务系统，正在寻找资源...');

        // 触发指定的 <li> 元素的点击事件
        await page.evaluate((selector) => {
            const li = document.querySelector(selector);
            li.click();
        }, liSelector);

        console.log('已触发响应事件，尝试保存网页资源');

        // 等待一段时间，确保内容已加载完毕
        await page.waitForTimeout(2000);

        // 获取链接的内容
        const content = await page.evaluate(async () => {
            const response = await fetch('https://jwxt.sztu.edu.cn/jsxsd/xskb/xskb_list.do');
            return response.text();
        });
        const $ = cheerio.load(content);
        const timetableContent = $('#timetable').html();
        const courses = [];

        // 获取所有的<td>元素
        const tdElements = $('td');

        // 遍历每个<td>元素
        tdElements.each((index, tdElement) => {
            // 获取当前<td>元素下的所有<div>元素
            const divElements = $(tdElement).find('div');

            // 遍历每个<div>元素
            divElements.each((index, divElement) => {
                const fontElements = $(divElement).find('font');

                // 提取课程信息
                const course = {
                    '课程名称': $(fontElements[0]).text(),
                    '任课教师': $(fontElements[1]).text(),
                    '课程周次': extractCourseWeek($(fontElements[2]).text()),
                    '上课地点': $(fontElements[3]).text(),
                    '上课教室': $(fontElements[4]).text(),
                    '上课节次': extractCourseTime($(fontElements[2]).text()),
                };

                // 判断课程是否为空
                const isEmpty = Object.values(course).every((value) => value.trim() === '');

                // 如果课程不为空，将其添加到课程列表中
                if (!isEmpty && course['上课地点'].trim() !== '' && course['上课教室'].trim() !== '') {
                    courses.push(course);
                }
            });
        });

        // 按照课程周次范围划分课程
        const courseListByWeek = groupCoursesByWeek(courses);

        // 将划分后的课程列表保存为 JSON 文件
        fs.writeFileSync('timetable.json', JSON.stringify(courseListByWeek, null, 2));
        console.log('已保存筛选后的课程文件（json）');

        // 将内容保存到本地文件
        fs.writeFileSync(outputFilePath, timetableContent);
        console.log('html内容已保存到文件:', outputFilePath);

        // 关闭浏览器
        await browser.close();
        check();

    } catch (error) {
        console.error('登录失败:', error);
    }
}

// 提取课程周次的函数
function extractCourseWeek(weekString) {
    const match = weekString.match(/\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*(?:\(周\)|\(双周\)|\(单周\))/);
    return match ? match[0] : '';
}

// 提取课程节次的函数
function extractCourseTime(timeString) {
    const match = timeString.match(/\[(.*?)\]/);
    return match ? match[1] : '';
}

// 提取课程周次范围的函数
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

// 生成周次列表的函数
function generateWeekList(weekRange) {
    const weekList = [];

    weekRange.forEach((week) => {
        weekList.push(`${week}`);
    });

    return weekList;
}

// 根据课程周次范围划分课程
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

// 开始模拟登录
simulateLogin();
