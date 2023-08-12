# SZTU_CourseSpider
Based on Javascript。  
## 环境需要：  
1.node.js  
2.本地puppeteer环境（CMD中输入npm install puppeteer，需要本地计算机中有node.js的环境变量）
## 注意事项  
- 爬取后的课表将以json格式保存至本地，与.js文件同一路径。  
- 在对html处理，将课表信息与样式区分开后，我还将课程信息根据单/双周，大/小节等进行了划分，得到了一个比较直观的课程表。所以最后保存到本地的json课表并不是直接爬取到的课程信息，这可能导致部分特殊课程在数据处理的时候被遗漏。
