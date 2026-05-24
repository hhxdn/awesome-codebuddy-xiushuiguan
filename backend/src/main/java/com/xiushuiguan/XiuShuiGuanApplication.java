package com.xiushuiguan;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.xiushuiguan.mapper")
public class XiuShuiGuanApplication {

    public static void main(String[] args) {
        SpringApplication.run(XiuShuiGuanApplication.class, args);
    }
}
