{
    "name": "安徽省图书馆",
    "url": "www.ahlib.com",
    "version": 100,
    "search": {
        "url": "https://es.bookan.com.cn/api/searchByType?instanceId=3&keyword=${key}&resourceType=1&searchType=1&pageNum=1&limit=30",
        "list": "$.data[?(@.issueInfo.html==1)]",
        "name": "$.resourceName",
        "author": "$.issueInfo.press",
        "summary": "$.issueInfo.text",
        "cover": "http://img1-qn.bookan.com.cn/page${$.issueInfo.jpg}/${$.resourceId}/${$.resourceId}-${$.issueInfo.issueId}/cover_small.mg",
        "detail": "http://user.bookan.com.cn/index.php?op=Resource.getHash&resourceType=1&resourceId=${$.resourceId}&issueId=${$.issueInfo.issueId}&start=0&end=0"
    },
    "detail": {
        "catalog": "http://img-qns.bookan.com.cn/epub1/${$params.resourceId}/${$params.resourceId}-${$params.issueId}/${$params.issueId}_${$.data[0].hash}/OEBPS/toc.ncx"
    },
    "catalog": {
        "list": "navPoint:gt(0)",
        "name": "text",
        "chapter": "content@attr->src"
    },
    "chapter": {
        "content":"p"
    }
}