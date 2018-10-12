<?php
date_default_timezone_set('PRC');
ini_set('error_reporting', E_ALL & ~E_NOTICE);
ini_set('display_errors', 'On');
require('thirdparty/Smarty.class.php');

$smarty = new Smarty();
$smarty->left_delimiter = "{%";
$smarty->right_delimiter = "%}";

$options = getopt('', array('dir:', 'name:', 'data:', 'cache:'));


$cacheDir = trim($options['cache']);
$templateDir = trim($options['dir']);

$smarty->setTemplateDir($templateDir)
    ->setCompileDir($cacheDir)
    ->setCacheDir($cacheDir.'/./.cache');

$tplData = trim($options['data']);
$tplData = json_decode($tplData, true);
if(!empty($tplData)){
    foreach($tplData as $key=>$val){
        $smarty->assign($key, $val);
    }
}
// var_dump($tplData);
$tplName = trim($options['name']);
if(!empty($tplName)){
    $smarty->display($tplName);
}
