{%extends file="../base.tpl"%}
{%block name="__css_asset"%}<link href="/static/css/demo.css" rel="stylesheet">{%/block%}
{%block name="__script_asset"%}<script type="text/javascript" src="/demo.js"></script>{%/block%}

{%block name="body"%}
<p style=background:red;>来自于mock/data 数据：</p>
<p style="font-size: 24px;">{%$data.pageInfo.common.title%}</p>
<div id=app></div>
{%/block%}
